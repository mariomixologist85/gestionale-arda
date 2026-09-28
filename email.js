// Email transazionali (credenziali di benvenuto e link di reimpostazione password).
// Nessuna dipendenza aggiuntiva: usa la fetch di Node.
//
// Provider supportati, si sceglie da quale chiave è presente tra le variabili:
//   RESEND_API_KEY  Resend (https://resend.com) — senza dominio verificato può scrivere
//                   solo all'indirizzo del proprio account Resend
//   BREVO_API_KEY   Brevo (https://www.brevo.com) — basta verificare l'indirizzo mittente
//
// Comuni a entrambi:
//   EMAIL_DA        mittente, es. "Arda Centro Estetico <info@ardacentrolistico.it>"
//   PUBLIC_URL      base dei collegamenti inviati (default: il dominio di produzione)
//   BREVO_API_URL / RESEND_API_URL   solo per collaudi contro un server fittizio

const ENDPOINT_BREVO = process.env.BREVO_API_URL || 'https://api.brevo.com/v3/smtp/email';
const ENDPOINT_RESEND = process.env.RESEND_API_URL || 'https://api.resend.com/emails';
const NOME_APP = 'Arda - Centro Estetico Olistico';

function urlPubblica() {
  return (process.env.PUBLIC_URL || 'https://www.ardacentrolistico.it').replace(/\/+$/, '');
}

function mittente() {
  const grezzo = (process.env.EMAIL_DA || '').trim();
  const conNome = grezzo.match(/^(.+?)\s*<([^>]+)>$/);
  if (conNome) return { name: conNome[1].trim(), email: conNome[2].trim() };
  return { name: NOME_APP, email: grezzo };
}

function provider() {
  if (process.env.RESEND_API_KEY) return 'resend';
  if (process.env.BREVO_API_KEY) return 'brevo';
  return null;
}

// L'invio è configurato solo con una chiave provider e un mittente
function configurato() {
  return Boolean(provider() && (process.env.EMAIL_DA || '').trim());
}

function escape(testo) {
  return String(testo ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function pagina({ titolo, corpo }) {
  return `<!doctype html>
<html lang="it"><body style="margin:0;background:#F9F5F0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#2C1810;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#FFFFFF;border:1px solid #E8D5B7;border-radius:16px;overflow:hidden;">
        <tr><td style="background:#2C1810;padding:20px 24px;">
          <div style="color:#C9A961;font-size:20px;font-weight:700;letter-spacing:2px;">ARDA</div>
          <div style="color:#D4B896;font-size:11px;letter-spacing:1px;text-transform:uppercase;">Centro Estetico Olistico</div>
        </td></tr>
        <tr><td style="padding:24px;">
          <h1 style="margin:0 0 16px;font-size:19px;">${escape(titolo)}</h1>
          <div style="font-size:15px;line-height:1.6;">${corpo}</div>
        </td></tr>
        <tr><td style="padding:0 24px 24px;color:#6B5B4F;font-size:12px;line-height:1.5;">
          Email generata automaticamente dal gestionale ${escape(NOME_APP)}. Se non l'hai richiesta tu, segnalalo a chi gestisce il centro.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function bottone(url, etichetta) {
  return `<p style="margin:24px 0;">
    <a href="${escape(url)}" style="display:inline-block;background:#C9A961;color:#2C1810;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:10px;">${escape(etichetta)}</a>
  </p>
  <p style="margin:0;color:#6B5B4F;font-size:12px;word-break:break-all;">Se il bottone non funziona copia questo indirizzo nel browser:<br>${escape(url)}</p>`;
}

// Il corpo dell'errore del provider può essere lungo: ne teniamo un estratto, mai la chiave
async function erroreInvio(risposta, nomeProvider) {
  const dettaglio = (await risposta.text()).slice(0, 300);
  return new Error(`Invio email fallito con ${nomeProvider} (${risposta.status}): ${dettaglio}`);
}

async function inviaConBrevo({ a, nome, oggetto, testo, html }) {
  const risposta = await fetch(ENDPOINT_BREVO, {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY,
      'content-type': 'application/json',
      accept: 'application/json'
    },
    body: JSON.stringify({
      sender: mittente(),
      to: [{ email: a, ...(nome ? { name: nome } : {}) }],
      subject: oggetto,
      htmlContent: html,
      textContent: testo
    })
  });
  if (!risposta.ok) throw await erroreInvio(risposta, 'Brevo');
  return risposta.json();
}

async function inviaConResend({ a, oggetto, testo, html }) {
  const { name, email: indirizzo } = mittente();
  const risposta = await fetch(ENDPOINT_RESEND, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      from: name ? `${name} <${indirizzo}>` : indirizzo,
      to: [a],
      subject: oggetto,
      html,
      text: testo
    })
  });
  if (!risposta.ok) throw await erroreInvio(risposta, 'Resend');
  return risposta.json();
}

async function inviaEmail(messaggio) {
  if (!configurato()) {
    throw new Error('Invio email non configurato: servono EMAIL_DA e una chiave tra RESEND_API_KEY e BREVO_API_KEY');
  }
  if (!messaggio.a) {
    throw new Error('Indirizzo email del destinatario mancante');
  }
  return provider() === 'resend' ? inviaConResend(messaggio) : inviaConBrevo(messaggio);
}

// Credenziali di primo accesso per un account appena creato
async function inviaCredenziali({ email, nome, username, password }) {
  const url = urlPubblica();
  const html = pagina({
    titolo: `Le tue credenziali per il gestionale, ${nome || username}`,
    corpo: `<p style="margin:0 0 16px;">È stato creato il tuo account per il gestionale del centro.</p>
      <p style="margin:0 0 4px;"><strong>Utente:</strong> ${escape(username)}</p>
      <p style="margin:0 0 16px;"><strong>Password:</strong> <code style="background:#F9F5F0;border:1px solid #E8D5B7;border-radius:6px;padding:2px 6px;">${escape(password)}</code></p>
      ${bottone(url, 'Apri il gestionale')}
      <p style="margin:16px 0 0;">Al primo accesso ti verrà chiesto di scegliere una password tua: non condividerla con nessuno.</p>`
  });

  return inviaEmail({
    a: email,
    nome,
    oggetto: `Gestionale ${NOME_APP}: le tue credenziali di accesso`,
    testo: `Ciao ${nome || username},\n\nutente: ${username}\npassword: ${password}\n\nApri il gestionale su ${url} e cambia la password al primo accesso.\n\nSe non ti è chiaro qualcosa, chiedi a chi gestisce il centro.`,
    html
  });
}

// Link di reimpostazione richiesto dall'utente
async function inviaReimpostazione({ email, nome, token, minuti }) {
  const url = `${urlPubblica()}/reimposta-password?token=${encodeURIComponent(token)}`;
  const html = pagina({
    titolo: `Reimpostazione della password${nome ? `, ${nome}` : ''}`,
    corpo: `<p style="margin:0 0 16px;">Abbiamo ricevuto una richiesta di reimpostazione della password del gestionale.</p>
      ${bottone(url, 'Scegli una nuova password')}
      <p style="margin:16px 0 0;">Il collegamento scade tra <strong>${Number(minuti)} minuti</strong> e si può usare una volta sola. Al termine tutte le sessioni aperte verranno chiuse.</p>
      <p style="margin:8px 0 0;">Se non hai fatto tu la richiesta, ignora questa email: la password resta quella attuale.</p>`
  });

  return inviaEmail({
    a: email,
    nome,
    oggetto: `Gestionale ${NOME_APP}: reimposta la password`,
    testo: `Ciao${nome ? ` ${nome}` : ''},\n\nper scegliere una nuova password apri questo collegamento entro ${minuti} minuti:\n${url}\n\nIl collegamento si usa una volta sola e alla fine tutte le sessioni aperte vengono chiuse.\nSe non hai fatto tu la richiesta, ignora questa email.`,
    html
  });
}

module.exports = { configurato, provider, inviaEmail, inviaCredenziali, inviaReimpostazione, urlPubblica };
