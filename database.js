const fs = require('fs');
const path = require('path');
const { hashPassword, isHashed, DURATA_SESSIONE_MS } = require('./auth');

const DB_PATH = path.join(__dirname, 'data', 'db.json');

// Database locale (per sviluppo)
let localDB = null;

function ensureDataDir() {
  const dir = path.join(__dirname, 'data');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadLocalDB() {
  ensureDataDir();
  if (!fs.existsSync(DB_PATH)) {
    const initial = {
      clienti: [],
      appuntamenti: [],
      servizi: [],
      trattamenti: [],
      operatori: [
        { id: 'op1', nome: 'Maria Rossi', specialita: 'Massaggi' },
        { id: 'op2', nome: 'Laura Bianchi', specialita: 'Estetica' },
        { id: 'op3', nome: 'Anna Verdi', specialita: 'Manicure' }
      ],
      utenti: [
        { id: 'usr1', username: 'admin', password: hashPassword('admin123'), ruolo: 'admin', nome: 'Amministratore' },
        { id: 'usr2', username: 'dipendente', password: hashPassword('dip123'), ruolo: 'dipendente', nome: 'Dipendente' }
      ],
      sessioni: [],
      passwordMaster: 'master2026'
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
  const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  if (!db.utenti) {
    db.utenti = [
      { id: 'usr1', username: 'admin', password: hashPassword('admin123'), ruolo: 'admin', nome: 'Amministratore' },
      { id: 'usr2', username: 'dipendente', password: hashPassword('dip123'), ruolo: 'dipendente', nome: 'Dipendente' }
    ];
  }
  if (!db.passwordMaster) {
    db.passwordMaster = 'master2026';
  }
  return db;
}

function saveLocalDB(data) {
  ensureDataDir();
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// Database PostgreSQL (per produzione su Railway)
let pgClient = null;

async function connectPostgreSQL() {
  if (process.env.DATABASE_URL) {
    try {
      const { Pool } = require('pg');
      const testClient = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      });

      // Test connessione
      await testClient.query('SELECT NOW()');
      
      // Se arriva qui, la connessione funziona
      pgClient = testClient;

      // Crea tabelle se non esistono
      await pgClient.query(`
        CREATE TABLE IF NOT EXISTS clienti (
          id VARCHAR PRIMARY KEY,
          nome VARCHAR NOT NULL,
          cognome VARCHAR NOT NULL,
          telefono VARCHAR,
          email VARCHAR,
          "dataNascita" VARCHAR,
          note TEXT,
          allergie TEXT,
          "dataCreazione" VARCHAR
        );

        CREATE TABLE IF NOT EXISTS servizi (
          id VARCHAR PRIMARY KEY,
          nome VARCHAR NOT NULL,
          durata INTEGER DEFAULT 60,
          prezzo DECIMAL DEFAULT 0,
          categoria VARCHAR,
          descrizione TEXT
        );

        CREATE TABLE IF NOT EXISTS appuntamenti (
          id VARCHAR PRIMARY KEY,
          "clienteId" VARCHAR,
          "clienteNome" VARCHAR,
          "clienteTelefono" VARCHAR,
          "servizioId" VARCHAR,
          "servizioNome" VARCHAR,
          "operatoreId" VARCHAR,
          "operatoreNome" VARCHAR,
          data VARCHAR,
          ora VARCHAR,
          durata INTEGER DEFAULT 60,
          note TEXT,
          stato VARCHAR DEFAULT 'confermato',
          "promemoriaInviato" BOOLEAN DEFAULT false,
          "dataPromemoria" VARCHAR,
          "whatsappConferma" VARCHAR,
          "dataConferma" VARCHAR,
          "dataCreazione" VARCHAR
        );

        CREATE TABLE IF NOT EXISTS trattamenti (
          id VARCHAR PRIMARY KEY,
          "clienteId" VARCHAR,
          "clienteNome" VARCHAR,
          "servizioId" VARCHAR,
          "servizioNome" VARCHAR,
          "operatoreId" VARCHAR,
          "operatoreNome" VARCHAR,
          data VARCHAR,
          note TEXT,
          prezzo DECIMAL DEFAULT 0,
          "dataCreazione" VARCHAR
        );

        CREATE TABLE IF NOT EXISTS utenti (
          id VARCHAR PRIMARY KEY,
          username VARCHAR UNIQUE NOT NULL,
          password VARCHAR NOT NULL,
          ruolo VARCHAR NOT NULL,
          nome VARCHAR NOT NULL
        );

        CREATE TABLE IF NOT EXISTS operatori (
          id VARCHAR PRIMARY KEY,
          nome VARCHAR NOT NULL,
          specialita VARCHAR
        );

        CREATE TABLE IF NOT EXISTS sessioni (
          token VARCHAR PRIMARY KEY,
          "utenteId" VARCHAR,
          username VARCHAR,
          ruolo VARCHAR,
          nome VARCHAR,
          "creatoIl" VARCHAR
        );

        CREATE TABLE IF NOT EXISTS config (
          key VARCHAR PRIMARY KEY,
          value VARCHAR NOT NULL
        );
      `);

      // I database creati dalle versioni precedenti hanno queste colonne minuscole,
      // mentre le query le referenziano con le virgolette: rinomina idempotente
      await pgClient.query(`
        DO $$
        BEGIN
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clienti' AND column_name = 'datanascita') THEN
            ALTER TABLE clienti RENAME COLUMN datanascita TO "dataNascita";
          END IF;
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clienti' AND column_name = 'datacreazione') THEN
            ALTER TABLE clienti RENAME COLUMN datacreazione TO "dataCreazione";
          END IF;
        END $$;
      `);

      // Inserisci operatori se non esistono
      const operatori = [
        { id: 'op1', nome: 'Maria Rossi', specialita: 'Massaggi' },
        { id: 'op2', nome: 'Laura Bianchi', specialita: 'Estetica' },
        { id: 'op3', nome: 'Anna Verdi', specialita: 'Manicure' }
      ];

      for (const op of operatori) {
        await pgClient.query(
          'INSERT INTO operatori (id, nome, specialita) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING',
          [op.id, op.nome, op.specialita]
        );
      }

      // Inserisci utenti default se non esistono
      const utenti = [
        { id: 'usr1', username: 'admin', password: hashPassword('admin123'), ruolo: 'admin', nome: 'Amministratore' },
        { id: 'usr2', username: 'dipendente', password: hashPassword('dip123'), ruolo: 'dipendente', nome: 'Dipendente' }
      ];

      for (const utente of utenti) {
        await pgClient.query(
          'INSERT INTO utenti (id, username, password, ruolo, nome) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (username) DO NOTHING',
          [utente.id, utente.username, utente.password, utente.ruolo, utente.nome]
        );
      }

      // Inserisci password master
      await pgClient.query(
        "INSERT INTO config (key, value) VALUES ('passwordMaster', 'master2026') ON CONFLICT (key) DO NOTHING"
      );

      console.log('✅ Connesso a PostgreSQL (Railway)');
      return true;
    } catch (error) {
      console.error('❌ Errore connessione PostgreSQL:', error.message);
      console.log('📁 Uso database locale');
      pgClient = null; // Resetta pgClient se la connessione fallisce
      return false;
    }
  }
  return false;
}

// Colonne aggiornabili per tabella (whitelist: i nomi non arrivano mai dall'utente)
const COLONNE_AGGIORNABILI = {
  clienti: ['nome', 'cognome', 'telefono', 'email', 'dataNascita', 'note', 'allergie'],
  servizi: ['nome', 'durata', 'prezzo', 'categoria', 'descrizione'],
  appuntamenti: [
    'clienteId', 'clienteNome', 'clienteTelefono', 'servizioId', 'servizioNome',
    'operatoreId', 'operatoreNome', 'data', 'ora', 'durata', 'note', 'stato',
    'promemoriaInviato', 'dataPromemoria', 'whatsappConferma', 'dataConferma'
  ]
};

// Una PUT con solo alcuni campi (es. lo stato del promemoria WhatsApp) non deve azzerare le altre colonne
async function aggiornaParziale(tabella, id, payload) {
  const campi = COLONNE_AGGIORNABILI[tabella].filter(c => payload[c] !== undefined);
  if (campi.length === 0) {
    const esistente = await pgClient.query(`SELECT * FROM ${tabella} WHERE id = $1`, [id]);
    return esistente.rows[0] || null;
  }

  const setClause = campi.map((c, i) => `"${c}" = $${i + 1}`).join(', ');
  const values = campi.map(c => payload[c]);
  values.push(id);

  const result = await pgClient.query(
    `UPDATE ${tabella} SET ${setClause} WHERE id = $${values.length} RETURNING *`,
    values
  );
  return result.rows[0] || null;
}

// Funzioni database unificate
const db = {
  // Clienti
  async getClienti() {
    if (pgClient) {
      const result = await pgClient.query('SELECT * FROM clienti ORDER BY "dataCreazione" DESC');
      return result.rows;
    }
    return loadLocalDB().clienti;
  },

  async addCliente(cliente) {
    if (pgClient) {
      await pgClient.query(
        'INSERT INTO clienti (id, nome, cognome, telefono, email, "dataNascita", note, allergie, "dataCreazione") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
        [cliente.id, cliente.nome, cliente.cognome, cliente.telefono, cliente.email, cliente.dataNascita, cliente.note, cliente.allergie, cliente.dataCreazione]
      );
      return cliente;
    }
    const data = loadLocalDB();
    data.clienti.push(cliente);
    saveLocalDB(data);
    return cliente;
  },

  async updateCliente(id, cliente) {
    if (pgClient) {
      return aggiornaParziale('clienti', id, cliente);
    }
    const data = loadLocalDB();
    const idx = data.clienti.findIndex(c => c.id === id);
    if (idx !== -1) {
      data.clienti[idx] = { ...data.clienti[idx], ...cliente, id };
      saveLocalDB(data);
      return data.clienti[idx];
    }
    return null;
  },

  async deleteCliente(id) {
    if (pgClient) {
      await pgClient.query('DELETE FROM clienti WHERE id=$1', [id]);
    } else {
      const data = loadLocalDB();
      data.clienti = data.clienti.filter(c => c.id !== id);
      saveLocalDB(data);
    }
    return { success: true };
  },

  // Appuntamenti
  async getAppuntamenti(filter = {}) {
    if (pgClient) {
      let query = 'SELECT * FROM appuntamenti';
      const conditions = [];
      const values = [];
      
      if (filter.data) {
        conditions.push(`data = $${conditions.length + 1}`);
        values.push(filter.data);
      }
      if (filter.operatoreId) {
        conditions.push(`"operatoreId" = $${conditions.length + 1}`);
        values.push(filter.operatoreId);
      }
      
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }
      
      query += ' ORDER BY data, ora';
      
      const result = await pgClient.query(query, values);
      return result.rows;
    }
    
    let results = loadLocalDB().appuntamenti;
    if (filter.data) results = results.filter(a => a.data === filter.data);
    if (filter.operatoreId) results = results.filter(a => a.operatoreId === filter.operatoreId);
    return results;
  },

  async addAppuntamento(app) {
    if (pgClient) {
      await pgClient.query(
        `INSERT INTO appuntamenti (id, "clienteId", "clienteNome", "clienteTelefono", "servizioId", "servizioNome", "operatoreId", "operatoreNome", data, ora, durata, note, stato, "promemoriaInviato", "whatsappConferma", "dataCreazione") 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
        [app.id, app.clienteId, app.clienteNome, app.clienteTelefono, app.servizioId, app.servizioNome, app.operatoreId, app.operatoreNome, app.data, app.ora, app.durata, app.note, app.stato, app.promemoriaInviato, app.whatsappConferma, app.dataCreazione]
      );
      return app;
    }
    const data = loadLocalDB();
    data.appuntamenti.push(app);
    saveLocalDB(data);
    return app;
  },

  async updateAppuntamento(id, app) {
    if (pgClient) {
      return aggiornaParziale('appuntamenti', id, app);
    }
    const data = loadLocalDB();
    const idx = data.appuntamenti.findIndex(a => a.id === id);
    if (idx !== -1) {
      data.appuntamenti[idx] = { ...data.appuntamenti[idx], ...app, id };
      saveLocalDB(data);
      return data.appuntamenti[idx];
    }
    return null;
  },

  async deleteAppuntamento(id) {
    if (pgClient) {
      await pgClient.query('DELETE FROM appuntamenti WHERE id=$1', [id]);
    } else {
      const data = loadLocalDB();
      data.appuntamenti = data.appuntamenti.filter(a => a.id !== id);
      saveLocalDB(data);
    }
    return { success: true };
  },

  // Servizi
  async getServizi() {
    if (pgClient) {
      const result = await pgClient.query('SELECT * FROM servizi ORDER BY nome');
      return result.rows;
    }
    return loadLocalDB().servizi;
  },

  async addServizio(servizio) {
    if (pgClient) {
      await pgClient.query(
        'INSERT INTO servizi (id, nome, durata, prezzo, categoria, descrizione) VALUES ($1, $2, $3, $4, $5, $6)',
        [servizio.id, servizio.nome, servizio.durata, servizio.prezzo, servizio.categoria, servizio.descrizione]
      );
      return servizio;
    }
    const data = loadLocalDB();
    data.servizi.push(servizio);
    saveLocalDB(data);
    return servizio;
  },

  async updateServizio(id, servizio) {
    if (pgClient) {
      return aggiornaParziale('servizi', id, servizio);
    }
    const data = loadLocalDB();
    const idx = data.servizi.findIndex(s => s.id === id);
    if (idx !== -1) {
      data.servizi[idx] = { ...data.servizi[idx], ...servizio, id };
      saveLocalDB(data);
      return data.servizi[idx];
    }
    return null;
  },

  async deleteServizio(id) {
    if (pgClient) {
      await pgClient.query('DELETE FROM servizi WHERE id=$1', [id]);
    } else {
      const data = loadLocalDB();
      data.servizi = data.servizi.filter(s => s.id !== id);
      saveLocalDB(data);
    }
    return { success: true };
  },

  // Trattamenti
  async getTrattamenti(filter = {}) {
    if (pgClient) {
      let query = 'SELECT * FROM trattamenti';
      const values = [];
      
      if (filter.clienteId) {
        query += ' WHERE "clienteId" = $1';
        values.push(filter.clienteId);
      }
      
      query += ' ORDER BY data DESC';
      
      const result = await pgClient.query(query, values);
      return result.rows;
    }
    
    let results = loadLocalDB().trattamenti;
    if (filter.clienteId) results = results.filter(t => t.clienteId === filter.clienteId);
    return results;
  },

  async addTrattamento(trattamento) {
    if (pgClient) {
      await pgClient.query(
        'INSERT INTO trattamenti (id, "clienteId", "clienteNome", "servizioId", "servizioNome", "operatoreId", "operatoreNome", data, note, prezzo, "dataCreazione") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
        [trattamento.id, trattamento.clienteId, trattamento.clienteNome, trattamento.servizioId, trattamento.servizioNome, trattamento.operatoreId, trattamento.operatoreNome, trattamento.data, trattamento.note, trattamento.prezzo, trattamento.dataCreazione]
      );
      return trattamento;
    }
    const data = loadLocalDB();
    data.trattamenti.push(trattamento);
    saveLocalDB(data);
    return trattamento;
  },

  async deleteTrattamento(id) {
    if (pgClient) {
      await pgClient.query('DELETE FROM trattamenti WHERE id=$1', [id]);
    } else {
      const data = loadLocalDB();
      data.trattamenti = data.trattamenti.filter(t => t.id !== id);
      saveLocalDB(data);
    }
    return { success: true };
  },

  // Utenti
  async getUtenti() {
    if (pgClient) {
      const result = await pgClient.query('SELECT * FROM utenti');
      return result.rows;
    }
    return loadLocalDB().utenti;
  },

  async getPasswordMaster() {
    if (pgClient) {
      const result = await pgClient.query("SELECT value FROM config WHERE key = 'passwordMaster'");
      return result.rows[0]?.value || 'master2026';
    }
    return loadLocalDB().passwordMaster || 'master2026';
  },

  // Sessioni di autenticazione
  async creaSessione(sessione) {
    if (pgClient) {
      await pgClient.query(
        'INSERT INTO sessioni (token, "utenteId", username, ruolo, nome, "creatoIl") VALUES ($1, $2, $3, $4, $5, $6)',
        [sessione.token, sessione.utenteId, sessione.username, sessione.ruolo, sessione.nome, sessione.creatoIl]
      );
      return sessione;
    }
    const data = loadLocalDB();
    data.sessioni = data.sessioni || [];
    data.sessioni.push(sessione);
    saveLocalDB(data);
    return sessione;
  },

  async getSessione(token) {
    let sessione = null;
    if (pgClient) {
      const result = await pgClient.query('SELECT * FROM sessioni WHERE token = $1', [token]);
      sessione = result.rows[0] || null;
    } else {
      const data = loadLocalDB();
      sessione = (data.sessioni || []).find(s => s.token === token) || null;
    }

    if (!sessione) return null;
    if (Date.now() - new Date(sessione.creatoIl).getTime() > DURATA_SESSIONE_MS) {
      await this.eliminaSessione(token);
      return null;
    }
    return sessione;
  },

  async eliminaSessione(token) {
    if (pgClient) {
      await pgClient.query('DELETE FROM sessioni WHERE token = $1', [token]);
    } else {
      const data = loadLocalDB();
      data.sessioni = (data.sessioni || []).filter(s => s.token !== token);
      saveLocalDB(data);
    }
    return { success: true };
  },

  // Migrazione una tantum: le password salvate in chiaro vengono sostituite dal loro hash
  async migraPasswordInChiaro() {
    if (pgClient) {
      const result = await pgClient.query("SELECT id, password FROM utenti WHERE password NOT LIKE 'scrypt$%'");
      for (const utente of result.rows) {
        await pgClient.query('UPDATE utenti SET password = $1 WHERE id = $2', [hashPassword(utente.password), utente.id]);
      }
      return result.rows.length;
    }
    const data = loadLocalDB();
    const daMigrare = (data.utenti || []).filter(u => !isHashed(u.password));
    for (const utente of daMigrare) {
      utente.password = hashPassword(utente.password);
    }
    if (daMigrare.length > 0) saveLocalDB(data);
    return daMigrare.length;
  },

  // Dashboard stats
  async getStats() {
    if (pgClient) {
      const oggi = new Date().toISOString().split('T')[0];
      const [totClienti, appuntamentiOggi, totServizi, totTrattamenti] = await Promise.all([
        pgClient.query('SELECT COUNT(*) FROM clienti'),
        pgClient.query('SELECT COUNT(*) FROM appuntamenti WHERE data = $1', [oggi]),
        pgClient.query('SELECT COUNT(*) FROM servizi'),
        pgClient.query('SELECT COUNT(*) FROM trattamenti')
      ]);
      return {
        totClienti: parseInt(totClienti.rows[0].count),
        appuntamentiOggi: parseInt(appuntamentiOggi.rows[0].count),
        totServizi: parseInt(totServizi.rows[0].count),
        totTrattamenti: parseInt(totTrattamenti.rows[0].count)
      };
    }
    const data = loadLocalDB();
    const oggi = new Date().toISOString().split('T')[0];
    return {
      totClienti: data.clienti.length,
      appuntamentiOggi: data.appuntamenti.filter(a => a.data === oggi).length,
      totServizi: data.servizi.length,
      totTrattamenti: data.trattamenti.length
    };
  },

  // Operatori (dati statici)
  async getOperatori() {
    if (pgClient) {
      const result = await pgClient.query('SELECT * FROM operatori ORDER BY nome');
      return result.rows;
    }
    return [
      { id: 'op1', nome: 'Maria Rossi', specialita: 'Massaggi' },
      { id: 'op2', nome: 'Laura Bianchi', specialita: 'Estetica' },
      { id: 'op3', nome: 'Anna Verdi', specialita: 'Manicure' }
    ];
  }
};

module.exports = { db, connectPostgreSQL };
