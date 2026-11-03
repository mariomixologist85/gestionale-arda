import { dataValida } from './giornata.js'

export function meseValido(mese) {
  return typeof mese === 'string' && /^\d{4}-\d{2}$/.test(mese) && dataValida(`${mese}-01`)
}

// Somme in centesimi per evitare errori come 0,10 + 0,20 = 0,30000000004.
export function prezzoInCentesimi(prezzo) {
  if (typeof prezzo !== 'number' && typeof prezzo !== 'string') return null
  const testo = String(prezzo).trim()
  if (!/^\d+(?:[.,]\d+)?$/.test(testo)) return null
  const [intero, frazione = ''] = testo.replace(',', '.').split('.')
  const centesimi = Number(intero) * 100 + Number(frazione.padEnd(2, '0').slice(0, 2)) + (Number(frazione.charAt(2) || '0') >= 5 ? 1 : 0)
  return Number.isSafeInteger(centesimi) && centesimi >= 0 ? centesimi : null
}

export function calcolaResoconto(appuntamenti, servizi, mese) {
  if (!meseValido(mese)) throw new Error('Mese non valido')
  const giorniNelMese = new Date(`${mese}-01T12:00:00Z`)
  giorniNelMese.setUTCMonth(giorniNelMese.getUTCMonth() + 1, 0)
  const prezzi = new Map(servizi.filter(s => s.id !== undefined && s.id !== null).map(s => [String(s.id), prezzoInCentesimi(s.prezzo)]))
  const giorni = Array.from({ length: giorniNelMese.getUTCDate() }, (_, index) => ({ data: `${mese}-${String(index + 1).padStart(2, '0')}`, centesimi: 0, confermati: 0, senzaPrezzo: 0, appuntamenti: [] }))
  let dateNonValide = 0
  for (const app of appuntamenti) {
    if (app.stato !== 'confermato') continue
    if (!dataValida(app.data)) { dateNonValide++; continue }
    if (!app.data.startsWith(`${mese}-`)) continue
    const giorno = giorni[Number(app.data.slice(8, 10)) - 1]
    const centesimi = app.servizioId !== undefined && app.servizioId !== null ? (prezzi.get(String(app.servizioId)) ?? null) : null
    giorno.confermati++
    if (centesimi === null) giorno.senzaPrezzo++
    else giorno.centesimi += centesimi
    giorno.appuntamenti.push({ ...app, centesimi })
  }
  for (const giorno of giorni) giorno.appuntamenti.sort((a, b) => String(a.ora || '').localeCompare(String(b.ora || '')))
  return {
    giorni,
    centesimi: giorni.reduce((n, g) => n + g.centesimi, 0),
    confermati: giorni.reduce((n, g) => n + g.confermati, 0),
    senzaPrezzo: giorni.reduce((n, g) => n + g.senzaPrezzo, 0),
    dateNonValide
  }
}
