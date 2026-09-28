// WhatsApp risponde con "Cross-Origin-Opener-Policy: same-origin-allow-popups":
// appena la sua pagina si carica, il browser sposta la scheda in un altro gruppo e
// recide il legame con chi l'ha aperta (l'handle risulta chiuso e l'URL illeggibile).
// Non è quindi possibile riusare né chiudere da qui la scheda di WhatsApp: ogni
// messaggio ne apre una propria. Restituisce null se il browser blocca il popup.
export function apriWhatsApp(link) {
  const finestra = window.open(link, '_blank')
  if (finestra) finestra.focus()
  return finestra
}
