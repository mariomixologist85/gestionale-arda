const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const { db, connectPostgreSQL } = require('./database');
const whatsapp = require('./whatsapp');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Connetti al database all'avvio
connectPostgreSQL().then(() => {
  console.log(' Server pronto');
});

// ===== AUTH =====
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const utenti = await db.getUtenti();
  const utente = utenti.find(u => u.username === username && u.password === password);
  if (!utente) {
    return res.status(401).json({ error: 'Credenziali non valide' });
  }
  res.json({
    id: utente.id,
    username: utente.username,
    ruolo: utente.ruolo,
    nome: utente.nome
  });
});

app.post('/api/verifica-master', async (req, res) => {
  const { password } = req.body;
  const passwordMaster = await db.getPasswordMaster();
  if (password === passwordMaster) {
    res.json({ valido: true });
  } else {
    res.status(401).json({ valido: false, error: 'Password master non corretta' });
  }
});

// ===== WHATSAPP =====
app.get('/api/whatsapp/link', (req, res) => {
  res.json({
    link: 'https://web.whatsapp.com',
    istruzioni: '1. Apri questo link nel browser\n2. Apri WhatsApp sul telefono\n3. Vai su Impostazioni > Dispositivi collegati\n4. Scansiona il QR code mostrato nel browser'
  });
});

app.get('/api/whatsapp/promemoria/:id', (req, res) => {
  try {
    const result = whatsapp.generaLinkPromemoria(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/whatsapp/messaggio', (req, res) => {
  try {
    const { numero, messaggio } = req.query;
    if (!numero || !messaggio) {
      return res.status(400).json({ error: 'Numero e messaggio sono obbligatori' });
    }
    const result = whatsapp.generaLinkMessaggio(numero, messaggio);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/whatsapp/stato', (req, res) => {
  res.json({
    connesso: true,
    metodo: 'link',
    descrizione: 'Sistema link WhatsApp attivo'
  });
});

// ===== CLIENTI =====
app.get('/api/clienti', async (req, res) => {
  const clienti = await db.getClienti();
  res.json(clienti);
});

app.get('/api/clienti/:id', async (req, res) => {
  const clienti = await db.getClienti();
  const cliente = clienti.find(c => c.id === req.params.id);
  if (!cliente) return res.status(404).json({ error: 'Cliente non trovato' });
  res.json(cliente);
});

app.post('/api/clienti', async (req, res) => {
  const nuovo = {
    id: crypto.randomUUID(),
    nome: req.body.nome,
    cognome: req.body.cognome,
    telefono: req.body.telefono || '',
    email: req.body.email || '',
    dataNascita: req.body.dataNascita || '',
    note: req.body.note || '',
    allergie: req.body.allergie || '',
    dataCreazione: new Date().toISOString()
  };
  await db.addCliente(nuovo);
  res.status(201).json(nuovo);
});

app.put('/api/clienti/:id', async (req, res) => {
  const result = await db.updateCliente(req.params.id, req.body);
  if (!result) return res.status(404).json({ error: 'Cliente non trovato' });
  res.json(result);
});

app.delete('/api/clienti/:id', async (req, res) => {
  await db.deleteCliente(req.params.id);
  res.json({ success: true });
});

// ===== SERVIZI =====
app.get('/api/servizi', async (req, res) => {
  const servizi = await db.getServizi();
  res.json(servizi);
});

app.post('/api/servizi', async (req, res) => {
  const nuovo = {
    id: crypto.randomUUID(),
    nome: req.body.nome,
    durata: req.body.durata || 60,
    prezzo: req.body.prezzo || 0,
    categoria: req.body.categoria || '',
    descrizione: req.body.descrizione || ''
  };
  await db.addServizio(nuovo);
  res.status(201).json(nuovo);
});

app.put('/api/servizi/:id', async (req, res) => {
  const result = await db.updateServizio(req.params.id, req.body);
  if (!result) return res.status(404).json({ error: 'Servizio non trovato' });
  res.json(result);
});

app.delete('/api/servizi/:id', async (req, res) => {
  await db.deleteServizio(req.params.id);
  res.json({ success: true });
});

// ===== APPUNTAMENTI =====
app.get('/api/appuntamenti', async (req, res) => {
  const { data, operatore } = req.query;
  const filter = {};
  if (data) filter.data = data;
  if (operatore) filter.operatoreId = operatore;
  const appuntamenti = await db.getAppuntamenti(filter);
  res.json(appuntamenti);
});

app.post('/api/appuntamenti', async (req, res) => {
  // Controllo conflitti appuntamenti
  const { operatoreId, data, ora, durata, id: existingId } = req.body;
  if (operatoreId && data && ora) {
    const nuovaDurata = parseInt(durata) || 60;
    const [ore, minuti] = ora.split(':').map(Number);
    const nuovoInizio = ore * 60 + minuti;
    const nuovoFine = nuovoInizio + nuovaDurata;

    const appuntamenti = await db.getAppuntamenti({ data, operatoreId });
    const conflitti = appuntamenti.filter(a => {
      if (existingId && a.id === existingId) return false;
      if (a.stato === 'annullato') return false;

      const [aOre, aMinuti] = a.ora.split(':').map(Number);
      const aInizio = aOre * 60 + aMinuti;
      const aDurata = parseInt(a.durata) || 60;
      const aFine = aInizio + aDurata;

      return (nuovoInizio < aFine && nuovoFine > aInizio);
    });

    if (conflitti.length > 0) {
      return res.status(409).json({
        error: 'Conflitto appuntamento',
        messaggio: `L'operatore è già occupato dalle ${conflitti[0].ora} per ${conflitti[0].durata} minuti`,
        conflitto: conflitti[0]
      });
    }
  }

  const nuovo = {
    id: crypto.randomUUID(),
    clienteId: req.body.clienteId,
    clienteNome: req.body.clienteNome || '',
    clienteTelefono: req.body.clienteTelefono || '',
    servizioId: req.body.servizioId,
    servizioNome: req.body.servizioNome || '',
    operatoreId: req.body.operatoreId,
    operatoreNome: req.body.operatoreNome || '',
    data: req.body.data,
    ora: req.body.ora,
    durata: req.body.durata || 60,
    note: req.body.note || '',
    stato: req.body.stato || 'confermato',
    promemoriaInviato: false,
    whatsappConferma: null,
    dataCreazione: new Date().toISOString()
  };
  await db.addAppuntamento(nuovo);
  res.status(201).json(nuovo);
});

app.put('/api/appuntamenti/:id', async (req, res) => {
  // Controllo conflitti appuntamenti
  const { operatoreId, data, ora, durata } = req.body;
  if (operatoreId && data && ora) {
    const nuovaDurata = parseInt(durata) || 60;
    const [ore, minuti] = ora.split(':').map(Number);
    const nuovoInizio = ore * 60 + minuti;
    const nuovoFine = nuovoInizio + nuovaDurata;

    const appuntamenti = await db.getAppuntamenti({ data, operatoreId });
    const conflitti = appuntamenti.filter(a => {
      if (a.id === req.params.id) return false;
      if (a.stato === 'annullato') return false;

      const [aOre, aMinuti] = a.ora.split(':').map(Number);
      const aInizio = aOre * 60 + aMinuti;
      const aDurata = parseInt(a.durata) || 60;
      const aFine = aInizio + aDurata;

      return (nuovoInizio < aFine && nuovoFine > aInizio);
    });

    if (conflitti.length > 0) {
      return res.status(409).json({
        error: 'Conflitto appuntamento',
        messaggio: `L'operatore è già occupato dalle ${conflitti[0].ora} per ${conflitti[0].durata} minuti`,
        conflitto: conflitti[0]
      });
    }
  }

  const result = await db.updateAppuntamento(req.params.id, req.body);
  if (!result) return res.status(404).json({ error: 'Appuntamento non trovato' });
  res.json(result);
});

app.delete('/api/appuntamenti/:id', async (req, res) => {
  await db.deleteAppuntamento(req.params.id);
  res.json({ success: true });
});

// ===== TRATTAMENTI (STORICO) =====
app.get('/api/trattamenti', async (req, res) => {
  const { clienteId } = req.query;
  const filter = {};
  if (clienteId) filter.clienteId = clienteId;
  const trattamenti = await db.getTrattamenti(filter);
  res.json(trattamenti);
});

app.post('/api/trattamenti', async (req, res) => {
  const nuovo = {
    id: crypto.randomUUID(),
    clienteId: req.body.clienteId,
    clienteNome: req.body.clienteNome || '',
    servizioId: req.body.servizioId,
    servizioNome: req.body.servizioNome || '',
    operatoreId: req.body.operatoreId,
    operatoreNome: req.body.operatoreNome || '',
    data: req.body.data,
    note: req.body.note || '',
    prezzo: req.body.prezzo || 0,
    dataCreazione: new Date().toISOString()
  };
  await db.addTrattamento(nuovo);
  res.status(201).json(nuovo);
});

app.delete('/api/trattamenti/:id', async (req, res) => {
  await db.deleteTrattamento(req.params.id);
  res.json({ success: true });
});

// ===== OPERATORI =====
app.get('/api/operatori', async (req, res) => {
  const operatori = await db.getOperatori();
  res.json(operatori);
});

// ===== DASHBOARD STATS =====
app.get('/api/dashboard/stats', async (req, res) => {
  const stats = await db.getStats();
  res.json(stats);
});

app.listen(PORT, () => {
  console.log(`Server backend attivo su http://localhost:${PORT}`);
});
