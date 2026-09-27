// Servizio WhatsApp con link wa.me
// Genera link per aprire WhatsApp con messaggio precompilato

const { db } = require('./database');

// Genera link WhatsApp per promemoria appuntamento
async function generaLinkPromemoria(appuntamentoId) {
  const appuntamenti = await db.getAppuntamenti();
  const appuntamento = appuntamenti.find(a => a.id === appuntamentoId);

  if (!appuntamento) {
    throw new Error('Appuntamento non trovato');
  }

  const clienti = await db.getClienti();
  const cliente = clienti.find(c => c.id === appuntamento.clienteId);

  if (!cliente || !cliente.telefono) {
    throw new Error('Cliente non trovato o telefono mancante');
  }

  // Formatta il numero (rimuovi spazi, +, ecc.)
  const numero = cliente.telefono.replace(/\D/g, '');

  // Crea il messaggio
  const messaggio = `Ciao ${cliente.nome}! 👋

Ti ricordiamo il tuo appuntamento presso *Arda - Centro Estetico Olistico*:

📅 Data: ${appuntamento.data}
⏰ Ora: ${appuntamento.ora}
💆 Servizio: ${appuntamento.servizioNome}
👤 Operatore: ${appuntamento.operatoreNome}

Per favore, rispondi a questo messaggio per confermare:
✅ SI - per confermare
❌ NO - per annullare

Ti aspettiamo! ✨`;

  // Codifica il messaggio per URL
  const messaggioCodificato = encodeURIComponent(messaggio);

  // Crea il link WhatsApp
  const link = `https://wa.me/${numero}?text=${messaggioCodificato}`;

  return {
    link,
    numero: cliente.telefono,
    clienteNome: `${cliente.nome} ${cliente.cognome}`,
    messaggio
  };
}

// Genera link WhatsApp per messaggio personalizzato
function generaLinkMessaggio(numero, messaggio) {
  const numeroPulito = numero.replace(/\D/g, '');
  const messaggioCodificato = encodeURIComponent(messaggio);
  const link = `https://wa.me/${numeroPulito}?text=${messaggioCodificato}`;

  return { link, numero, messaggio };
}

module.exports = {
  generaLinkPromemoria,
  generaLinkMessaggio
};
