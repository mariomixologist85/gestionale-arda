// Autenticazione: hash password con scrypt e token di sessione Bearer
const crypto = require('crypto');

const DURATA_SESSIONE_MS = 30 * 24 * 60 * 60 * 1000;

function hashPassword(password, sale = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, sale, 64).toString('hex');
  return `scrypt$${sale}$${hash}`;
}

function isHashed(valore) {
  return typeof valore === 'string' && valore.startsWith('scrypt$');
}

function verificaPassword(password, memorizzata) {
  if (!isHashed(memorizzata)) {
    return memorizzata === password;
  }
  const [, sale, hash] = memorizzata.split('$');
  const candidato = crypto.scryptSync(password, sale, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(candidato, 'hex'));
}

function nuovoToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Middleware: richiede Authorization: Bearer <token> con sessione valida nel database
function richiediAuth(db) {
  return async (req, res, next) => {
    const intestazione = req.headers.authorization || '';
    const token = intestazione.startsWith('Bearer ') ? intestazione.slice(7) : null;
    if (!token) {
      return res.status(401).json({ error: 'Autenticazione richiesta' });
    }

    const sessione = await db.getSessione(token);
    if (!sessione) {
      return res.status(401).json({ error: 'Sessione scaduta, accedi di nuovo' });
    }

    req.utente = sessione;
    next();
  };
}

module.exports = { hashPassword, isHashed, verificaPassword, nuovoToken, richiediAuth, DURATA_SESSIONE_MS };
