const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');
const { db, connectPostgreSQL } = require('./database');
const { hashPassword, verificaPassword, nuovoToken, richiediAuth } = require('./auth');
const whatsapp = require('./whatsapp');
const email = require('./email');

const app = express();
const PORT = process.env.PORT || 3001;

// In produzione il frontend è servito dallo stesso dominio: CORS serve solo in sviluppo
const originiConsentite = [
  'http://localhost:3000',
  'http://localhost:5173',
  ...(process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : [])
];
app.use(cors({ origin: originiConsentite }));
app.use(express.json());

// Servi i file statici del frontend (produzione)
app.use(express.static(path.join(__dirname, 'frontend', 'dist')));

// Connetti al database all'avvio e migra le eventuali password ancora in chiaro
connectPostgreSQL().then(async () => {
  const migrate = await db.migraPasswordInChiaro();
  if (migrate > 0) {
    console.log(`🔐 Migrata/e ${migrate} password in chiaro`);
  }
  if (await db.migraPasswordMasterInChiaro()) {
    console.log('🔐 Migrata la password master in chiaro');
  }
  console.log(' Server pronto');
});

// Credenziali create dal seed: sono nel repository, quindi da considerarsi compromesse
const CREDENZIALI_DEFAULT = ['admin123', 'dip123', 'master2026'];
const LUNGHEZZA_MINIMA_PASSWORD = 10;
const DURATA_RESET_MINUTI = 30;

// Senza caratteri ambigui (0/O, 1/l/I): queste password possono servire anche a voce
const ALFABETO_PASSWORD = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

function generaPasswordCasuale(lunghezza = 16) {
  const byte = crypto.randomBytes(lunghezza);
  return Array.from(byte, (b) => ALFABETO_PASSWORD[b % ALFABETO_PASSWORD.length]).join('');
}

function emailValida(valore) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((valore || '').trim());
}

function validaNuovaPassword(password) {
  if (!password || password.length < LUNGHEZZA_MINIMA_PASSWORD) {
    return `La password deve avere almeno ${LUNGHEZZA_MINIMA_PASSWORD} caratteri`;
  }
  if (CREDENZIALI_DEFAULT.includes(password)) {
    return 'Questa è una password predefinita dell\'installazione: scegline una diversa';
  }
  return null;
}

// Gli errori di credenziali rispondono 403, non 401: il frontend chiude la sessione su qualunque 401
function soloAdmin(req, res) {
  if (req.utente.ruolo !== 'admin') {
    res.status(403).json({ error: 'Operazione riservata all\'amministratore' });
    return false;
  }
  return true;
}

// ===== AUTH =====
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const utenti = await db.getUtenti();
  const utente = utenti.find(u => u.username === username);
  if (!utente || !verificaPassword(password || '', utente.password)) {
    return res.status(401).json({ error: 'Credenziali non valide' });
  }

  const sessione = {
    token: nuovoToken(),
    utenteId: utente.id,
    username: utente.username,
    ruolo: utente.ruolo,
    nome: utente.nome,
    creatoIl: new Date().toISOString()
  };
  await db.creaSessione(sessione);

  res.json({
    token: sessione.token,
    id: utente.id,
    username: utente.username,
    ruolo: utente.ruolo,
    nome: utente.nome,
    // Avviso in cima alle pagine finché la password non è scelta dall'utente
    passwordDaCambiare: utente.passwordDaCambiare === true || CREDENZIALI_DEFAULT.includes(password || '')
  });
});

// ===== RECUPERO PASSWORD =====
// Rotte pubbliche: chi ha dimenticato la password non ha un token di sessione
app.post('/api/recupera-password', async (req, res) => {
  const identificativo = (req.body.identificativo || '').trim();
  if (!identificativo) {
    return res.status(400).json({ error: 'Inserisci il tuo username o la tua email' });
  }
  if (!email.configurato()) {
    return res.status(503).json({ error: 'Il recupero password non è ancora attivo: l\'invio delle email non è configurato sul server' });
  }

  // Risposta identica sia che l'account esista sia che non esista: non riveliamo chi è registrato
  const risposta = {
    success: true,
    messaggio: 'Se l\'account esiste e ha un\'email associata, riceverai un collegamento per scegliere una nuova password'
  };

  const utente = await db.getUtentePerAccesso(identificativo);
  if (!utente || !emailValida(utente.email)) {
    return res.json(risposta);
  }

  const token = nuovoToken();
  const creatoIl = new Date();
  await db.creaReimpostazione({
    token,
    utenteId: utente.id,
    creatoIl: creatoIl.toISOString(),
    scadenza: new Date(creatoIl.getTime() + DURATA_RESET_MINUTI * 60 * 1000).toISOString()
  });

  try {
    await email.inviaReimpostazione({
      email: utente.email,
      nome: utente.nome,
      token,
      minuti: DURATA_RESET_MINUTI
    });
  } catch (errore) {
    console.error('Invio email di reimpostazione fallito:', errore.message);
    return res.status(502).json({ error: 'Non riesco a inviare l\'email in questo momento: riprova più tardi' });
  }
  res.json(risposta);
});

app.get('/api/recupera-password/:token', async (req, res) => {
  const richiesta = await db.getReimpostazione(req.params.token);
  if (!richiesta || richiesta.usato || new Date(richiesta.scadenza).getTime() < Date.now()) {
    return res.status(400).json({ valido: false, error: 'Collegamento non valido o scaduto: richiedine uno nuovo' });
  }
  const utente = await db.getUtente(richiesta.utenteId);
  res.json({ valido: true, username: utente?.username || '' });
});

app.post('/api/reimposta-password', async (req, res) => {
  const { token, nuovaPassword } = req.body;
  const richiesta = token ? await db.getReimpostazione(token) : null;
  if (!richiesta || richiesta.usato || new Date(richiesta.scadenza).getTime() < Date.now()) {
    return res.status(400).json({ error: 'Collegamento non valido o scaduto: richiedine uno nuovo' });
  }

  const errore = validaNuovaPassword(nuovaPassword);
  if (errore) return res.status(400).json({ error: errore });

  await db.aggiornaUtente(richiesta.utenteId, {
    password: hashPassword(nuovaPassword),
    passwordDaCambiare: false
  });
  await db.consumaReimpostazione(token);
  // Chi passa dal link potrebbe farlo perché la password era nota ad altri
  const sessioniChiuse = await db.eliminaSessioniUtente(richiesta.utenteId);
  res.json({ success: true, sessioniChiuse });
});

// Da qui in poi tutte le /api/* richiedono il token di sessione
app.use('/api', richiediAuth(db));

app.post('/api/logout', async (req, res) => {
  await db.eliminaSessione(req.headers.authorization.slice(7));
  res.json({ success: true });
});

app.post('/api/verifica-master', async (req, res) => {
  const { password } = req.body;
  const passwordMaster = await db.getPasswordMaster();
  if (verificaPassword(password || '', passwordMaster)) {
    res.json({ valido: true });
  } else {
    res.status(403).json({ valido: false, error: 'Password master non corretta' });
  }
});

// ===== CREDENZIALI =====
const RUOLI_CONSENTITI = ['admin', 'dipendente'];

app.post('/api/password', async (req, res) => {
  const { passwordAttuale, nuovaPassword } = req.body;
  const utente = await db.getUtente(req.utente.utenteId);
  if (!utente) return res.status(404).json({ error: 'Utente non trovato' });

  if (!verificaPassword(passwordAttuale || '', utente.password)) {
    return res.status(403).json({ error: 'Password attuale non corretta' });
  }
  const errore = validaNuovaPassword(nuovaPassword);
  if (errore) return res.status(400).json({ error: errore });
  if (verificaPassword(nuovaPassword, utente.password)) {
    return res.status(400).json({ error: 'La nuova password deve essere diversa da quella attuale' });
  }

  await db.aggiornaUtente(utente.id, { password: hashPassword(nuovaPassword), passwordDaCambiare: false });
  res.json({ success: true });
});

// Ognuno può aggiornare la propria email: è dove arriva il link di recupero
app.put('/api/profilo', async (req, res) => {
  const nuovaEmail = (req.body.email || '').trim();
  if (nuovaEmail && !emailValida(nuovaEmail)) {
    return res.status(400).json({ error: 'Indirizzo email non valido' });
  }

  const altri = (await db.getUtenti()).filter(u => u.id !== req.utente.utenteId);
  if (nuovaEmail && altri.some(u => (u.email || '').toLowerCase() === nuovaEmail.toLowerCase())) {
    return res.status(400).json({ error: 'Questa email è già associata a un altro account' });
  }

  const aggiornato = await db.aggiornaUtente(req.utente.utenteId, { email: nuovaEmail });
  if (!aggiornato) return res.status(404).json({ error: 'Utente non trovato' });
  res.json({ id: aggiornato.id, username: aggiornato.username, ruolo: aggiornato.ruolo, nome: aggiornato.nome, email: aggiornato.email });
});

app.get('/api/utenti', async (req, res) => {
  if (!soloAdmin(req, res)) return;
  const utenti = await db.getUtenti();
  // L'hash della password non esce mai dal server
  res.json(utenti.map(({ id, username, ruolo, nome, email: indirizzo, passwordDaCambiare }) => (
    { id, username, ruolo, nome, email: indirizzo || '', passwordDaCambiare: passwordDaCambiare === true }
  )));
});

app.post('/api/utenti', async (req, res) => {
  if (!soloAdmin(req, res)) return;

  const username = (req.body.username || '').trim();
  const nome = (req.body.nome || '').trim();
  const ruolo = (req.body.ruolo || '').trim();
  const indirizzo = (req.body.email || '').trim();

  if (!username || !nome) return res.status(400).json({ error: 'Username e nome sono obbligatori' });
  if (!RUOLI_CONSENTITI.includes(ruolo)) return res.status(400).json({ error: `Il ruolo deve essere uno tra: ${RUOLI_CONSENTITI.join(', ')}` });
  if (!emailValida(indirizzo)) return res.status(400).json({ error: 'Serve un\'email valida: è dove arrivano le credenziali e il link di recupero' });

  const esistenti = await db.getUtenti();
  if (esistenti.some(u => u.username.toLowerCase() === username.toLowerCase())) {
    return res.status(400).json({ error: 'Esiste già un account con questo username' });
  }
  if (esistenti.some(u => (u.email || '').toLowerCase() === indirizzo.toLowerCase())) {
    return res.status(400).json({ error: 'Esiste già un account con questa email' });
  }
  if (!email.configurato()) {
    // Senza invio email la password generata non arriverebbe a nessuno: meglio non creare l'account
    return res.status(503).json({ error: 'Invio email non configurato: impossibile consegnare le credenziali al nuovo utente' });
  }

  const password = generaPasswordCasuale();
  const nuovo = {
    id: crypto.randomUUID(),
    username,
    password: hashPassword(password),
    ruolo,
    nome,
    email: indirizzo,
    passwordDaCambiare: true
  };

  try {
    await email.inviaCredenziali({ email: indirizzo, nome, username, password });
  } catch (errore) {
    console.error('Invio credenziali fallito:', errore.message);
    return res.status(502).json({ error: 'Account non creato: non riesco a inviare l\'email con le credenziali' });
  }

  await db.addUtente(nuovo);
  res.status(201).json({ id: nuovo.id, username, ruolo, nome, email: indirizzo, passwordDaCambiare: true });
});

app.put('/api/utenti/:id', async (req, res) => {
  if (!soloAdmin(req, res)) return;

  const campi = {};
  if (req.body.nome !== undefined) {
    const nome = (req.body.nome || '').trim();
    if (!nome) return res.status(400).json({ error: 'Il nome non può essere vuoto' });
    campi.nome = nome;
  }
  if (req.body.ruolo !== undefined) {
    if (!RUOLI_CONSENTITI.includes(req.body.ruolo)) {
      return res.status(400).json({ error: `Il ruolo deve essere uno tra: ${RUOLI_CONSENTITI.join(', ')}` });
    }
    campi.ruolo = req.body.ruolo;
  }
  if (req.body.email !== undefined) {
    const indirizzo = (req.body.email || '').trim();
    if (indirizzo && !emailValida(indirizzo)) return res.status(400).json({ error: 'Indirizzo email non valido' });
    const altri = (await db.getUtenti()).filter(u => u.id !== req.params.id);
    if (indirizzo && altri.some(u => (u.email || '').toLowerCase() === indirizzo.toLowerCase())) {
      return res.status(400).json({ error: 'Questa email è già associata a un altro account' });
    }
    campi.email = indirizzo;
  }
  if (Object.keys(campi).length === 0) return res.status(400).json({ error: 'Nessuna modifica richiesta' });

  const aggiornato = await db.aggiornaUtente(req.params.id, campi);
  if (!aggiornato) return res.status(404).json({ error: 'Utente non trovato' });
  res.json({ id: aggiornato.id, username: aggiornato.username, ruolo: aggiornato.ruolo, nome: aggiornato.nome, email: aggiornato.email || '' });
});

// Reimposta generando una password casuale inviata per email: nessuno, admin compreso, la conosce
app.post('/api/utenti/:id/reimposta', async (req, res) => {
  if (!soloAdmin(req, res)) return;

  const utente = await db.getUtente(req.params.id);
  if (!utente) return res.status(404).json({ error: 'Utente non trovato' });
  if (!emailValida(utente.email)) {
    return res.status(400).json({ error: 'L\'account non ha un\'email valida: associane una, oppure imposta tu una password' });
  }
  if (!email.configurato()) {
    return res.status(503).json({ error: 'Invio email non configurato sul server' });
  }

  const password = generaPasswordCasuale();
  try {
    await email.inviaCredenziali({ email: utente.email, nome: utente.nome, username: utente.username, password });
  } catch (errore) {
    console.error('Invio nuova password fallito:', errore.message);
    return res.status(502).json({ error: 'Non riesco a inviare l\'email con la nuova password' });
  }

  await db.aggiornaUtente(utente.id, { password: hashPassword(password), passwordDaCambiare: true });
  const sessioniChiuse = await db.eliminaSessioniUtente(utente.id);
  res.json({ success: true, inviataA: utente.email, sessioniChiuse });
});

// Reimposta con una password scelta dall'admin: serve solo per gli account senza email
app.put('/api/utenti/:id/password', async (req, res) => {
  if (!soloAdmin(req, res)) return;
  const errore = validaNuovaPassword(req.body.nuovaPassword);
  if (errore) return res.status(400).json({ error: errore });

  const utente = await db.getUtente(req.params.id);
  if (!utente) return res.status(404).json({ error: 'Utente non trovato' });

  await db.aggiornaUtente(utente.id, { password: hashPassword(req.body.nuovaPassword), passwordDaCambiare: true });
  const sessioniChiuse = await db.eliminaSessioniUtente(utente.id);
  res.json({ success: true, sessioniChiuse });
});

app.put('/api/password-master', async (req, res) => {
  if (!soloAdmin(req, res)) return;
  const { passwordAttuale, nuovaPassword } = req.body;

  if (!verificaPassword(passwordAttuale || '', await db.getPasswordMaster())) {
    return res.status(403).json({ error: 'Password master attuale non corretta' });
  }
  const errore = validaNuovaPassword(nuovaPassword);
  if (errore) return res.status(400).json({ error: errore });

  await db.setPasswordMaster(hashPassword(nuovaPassword));
  res.json({ success: true });
});

// ===== WHATSAPP =====
app.get('/api/whatsapp/link', (req, res) => {
  res.json({
    link: 'https://web.whatsapp.com',
    istruzioni: '1. Apri questo link nel browser\n2. Apri WhatsApp sul telefono\n3. Vai su Impostazioni > Dispositivi collegati\n4. Scansiona il QR code mostrato nel browser'
  });
});

app.get('/api/whatsapp/promemoria/:id', async (req, res) => {
  try {
    const result = await whatsapp.generaLinkPromemoria(req.params.id);
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

app.post('/api/operatori', async (req, res) => {
  const { nome, specialita } = req.body;
  if (!nome || !String(nome).trim()) {
    return res.status(400).json({ error: 'Il nome è obbligatorio' });
  }
  const operatore = await db.addOperatore({ nome: String(nome).trim(), specialita: specialita || '' });
  res.status(201).json(operatore);
});

app.put('/api/operatori/:id', async (req, res) => {
  const operatore = await db.updateOperatore(req.params.id, req.body);
  if (!operatore) {
    return res.status(404).json({ error: 'Operatore non trovato' });
  }
  res.json(operatore);
});

app.delete('/api/operatori/:id', async (req, res) => {
  const eliminato = await db.deleteOperatore(req.params.id);
  if (!eliminato) {
    return res.status(404).json({ error: 'Operatore non trovato' });
  }
  res.json({ success: true });
});

// ===== DASHBOARD STATS =====
app.get('/api/dashboard/stats', async (req, res) => {
  const stats = await db.getStats();
  res.json(stats);
});

// Fallback per SPA - tutte le route non API restituiscono index.html
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server backend attivo su http://localhost:${PORT}`);
});
