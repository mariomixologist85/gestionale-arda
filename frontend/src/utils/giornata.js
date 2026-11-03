// Date e orari della sede: nessuna scrittura sui dati degli appuntamenti.
export function dataCentro(ora = new Date()) {
  const parti = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(ora)
  const parte = tipo => parti.find(p => p.type === tipo).value
  return `${parte('year')}-${parte('month')}-${parte('day')}`
}

export function dataValida(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false
  const data = new Date(`${value}T12:00:00Z`)
  return !Number.isNaN(data.getTime()) && data.toISOString().slice(0, 10) === value
}

export function spostaGiorno(value, giorni) {
  const data = new Date(`${value}T12:00:00Z`)
  data.setUTCDate(data.getUTCDate() + giorni)
  return data.toISOString().slice(0, 10)
}

export function formattaData(value, opzioni = {}) {
  return new Intl.DateTimeFormat('it-IT', {
    timeZone: 'Europe/Rome', day: 'numeric', month: 'long', ...opzioni
  }).format(new Date(`${value}T12:00:00Z`))
}

export function minutiOra(value) {
  const match = /^(\d{2}):(\d{2})(?::\d{2})?$/.exec(String(value || ''))
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) return null
  return Number(match[1]) * 60 + Number(match[2])
}

export function minutiCentro(ora = new Date()) {
  const parti = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(ora)
  return Number(parti.find(p => p.type === 'hour').value) * 60 + Number(parti.find(p => p.type === 'minute').value)
}

export function fineAppuntamento(app) {
  const inizio = minutiOra(app.ora)
  const durata = Number(app.durata)
  if (inizio === null || !Number.isFinite(durata) || durata <= 0) return null
  return inizio + durata
}

export function orarioFine(app) {
  const fine = fineAppuntamento(app)
  if (fine === null) return '—'
  const orario = `${String(Math.floor(fine / 60) % 24).padStart(2, '0')}:${String(fine % 60).padStart(2, '0')}`
  return fine >= 1440 ? `${orario} (+1 giorno)` : orario
}

export function daConfermare(app) {
  return !['annullato', 'completato'].includes(app.stato) &&
    !app.whatsappConferma && (app.stato === 'pending' || Boolean(app.promemoriaInviato))
}
