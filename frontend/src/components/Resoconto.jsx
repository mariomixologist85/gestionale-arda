import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { Link } from 'react-router-dom'
import { FiArrowRight, FiBarChart2, FiCalendar, FiChevronLeft, FiChevronRight, FiInfo, FiRefreshCw } from 'react-icons/fi'
import { API_BASE_URL } from '../config.js'
import { dataCentro, dataValida, formattaData } from '../utils/giornata.js'
import { calcolaResoconto, meseValido } from '../utils/resoconto.js'
import './Resoconto.css'

const euro = valore => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(valore / 100)
const nomeMese = mese => formattaData(`${mese}-01`, { day: undefined, month: 'long', year: 'numeric' })
const importo = gruppo => gruppo.confermati > 0 && gruppo.senzaPrezzo === gruppo.confermati ? 'Non disponibile' : euro(gruppo.centesimi)

export default function Resoconto() {
  const [giorno, setGiorno] = useState(() => dataCentro())
  const mese = giorno.slice(0, 7)
  const [dati, setDati] = useState({ appuntamenti: [], servizi: [] })
  const [caricamento, setCaricamento] = useState(true)
  const [errore, setErrore] = useState('')
  const [ricarica, setRicarica] = useState(0)
  const [aggiornato, setAggiornato] = useState(null)
  const [mostraTutti, setMostraTutti] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    setCaricamento(true)
    setErrore('')
    Promise.all([
      axios.get(`${API_BASE_URL}/api/appuntamenti`, { signal: controller.signal }),
      axios.get(`${API_BASE_URL}/api/servizi`, { signal: controller.signal })
    ]).then(([appuntamenti, servizi]) => {
      if (!Array.isArray(appuntamenti.data) || !Array.isArray(servizi.data)) throw new Error('Risposta non valida')
      if (!controller.signal.aborted) { setDati({ appuntamenti: appuntamenti.data, servizi: servizi.data }); setAggiornato(new Date()) }
    }).catch(() => {
      if (!controller.signal.aborted) setErrore('Non riesco a caricare appuntamenti e listino. Riprova per visualizzare il resoconto.')
    }).finally(() => { if (!controller.signal.aborted) setCaricamento(false) })
    return () => controller.abort()
  }, [ricarica])

  const report = useMemo(() => calcolaResoconto(dati.appuntamenti, dati.servizi, mese), [dati, mese])
  const selezionato = report.giorni.find(g => g.data === giorno)
  const massimo = Math.max(1, ...report.giorni.map(g => g.centesimi))
  const pronto = !caricamento && !errore
  const giorniVisibili = mostraTutti ? report.giorni : report.giorni.filter(g => g.confermati > 0)
  const cambiaMese = nuovoMese => {
    if (!meseValido(nuovoMese) || nuovoMese < '1900-01' || nuovoMese > '9999-12') return
    const oggi = dataCentro()
    setGiorno(oggi.startsWith(nuovoMese) ? oggi : `${nuovoMese}-01`)
  }
  const spostaMese = delta => {
    const data = new Date(`${mese}-01T12:00:00Z`)
    data.setUTCMonth(data.getUTCMonth() + delta)
    cambiaMese(data.toISOString().slice(0, 7))
  }

  return (
    <div className="arda-report">
      <header className="report-heading"><div><p className="day-eyebrow">Il tuo centro, a colpo d’occhio</p><h1>Resoconto</h1><p>Riepilogo personale degli appuntamenti confermati.</p></div><button type="button" className="day-button day-button-secondary" onClick={() => setRicarica(n => n + 1)} disabled={caricamento}><FiRefreshCw aria-hidden="true" />Aggiorna</button></header>
      <div className="report-notice"><FiInfo aria-hidden="true" /><div><strong>Stima informativa, separata dalla cassa.</strong><p>Il valore è calcolato al prezzo attuale dei servizi, non sui pagamenti ricevuti. I cambi di listino modificano anche le stime dei mesi passati. Sconti, acconti e pagamenti non sono inclusi.</p><p>Si contano solo gli appuntamenti con stato <b>Confermato</b>. Completati, in attesa e annullati sono esclusi.</p></div></div>
      <section className="report-filters" aria-label="Periodo del resoconto"><div><label htmlFor="report-month">Mese</label><div className="report-month-picker"><button type="button" aria-label="Mese precedente" onClick={() => spostaMese(-1)} disabled={mese <= '1900-01'}><FiChevronLeft aria-hidden="true" /></button><input id="report-month" type="month" value={mese} min="1900-01" max="9999-12" onChange={e => cambiaMese(e.target.value)} /><button type="button" aria-label="Mese successivo" onClick={() => spostaMese(1)} disabled={mese >= '9999-12'}><FiChevronRight aria-hidden="true" /></button></div></div><div><label htmlFor="report-day">Giorno da consultare</label><input id="report-day" type="date" min="1900-01-01" max="9999-12-31" value={giorno} onChange={e => { if (dataValida(e.target.value) && e.target.validity.valid) setGiorno(e.target.value) }} /></div>{aggiornato && pronto && <p className="report-updated">Dati aggiornati alle {new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit' }).format(aggiornato)}</p>}</section>
      {errore ? <div className="report-error" role="alert"><p>{errore}</p><button type="button" className="day-button day-button-secondary" onClick={() => setRicarica(n => n + 1)}>Riprova</button></div> : caricamento ? <div className="report-loading" role="status">Caricamento del resoconto…</div> : <>
        <section className="report-totals" aria-label="Valori stimati"><div className="report-total"><span className="report-icon"><FiCalendar aria-hidden="true" /></span><div><h2>Valore del giorno</h2><p>{formattaData(giorno, { year: 'numeric' })}</p><strong className="report-amount" data-testid="report-day-total">{importo(selezionato)}</strong><span>{selezionato.confermati} {selezionato.confermati === 1 ? 'appuntamento confermato' : 'appuntamenti confermati'}</span>{selezionato.senzaPrezzo > 0 && <small>Totale {selezionato.senzaPrezzo === selezionato.confermati ? 'non calcolabile' : 'parziale'}: {selezionato.senzaPrezzo} senza prezzo.</small>}</div></div><div className="report-total report-total-month"><span className="report-icon"><FiBarChart2 aria-hidden="true" /></span><div><h2>Valore del mese</h2><p>{nomeMese(mese)}</p><strong className="report-amount" data-testid="report-month-total">{importo(report)}</strong><span>{report.confermati} {report.confermati === 1 ? 'appuntamento confermato' : 'appuntamenti confermati'}</span>{report.senzaPrezzo > 0 && <small>Totale {report.senzaPrezzo === report.confermati ? 'non calcolabile' : 'parziale'}: {report.senzaPrezzo} senza prezzo.</small>}</div></div></section>
        {report.senzaPrezzo > 0 && <p className="report-warning" role="status">Nel mese ci sono {report.senzaPrezzo} appuntamenti confermati con servizio assente dal listino o prezzo non valido. I relativi importi sono esclusi dalla somma e indicati come “Prezzo non disponibile”.</p>}
        {report.dateNonValide > 0 && <p className="report-warning">{report.dateNonValide === 1 ? 'Un appuntamento confermato nell’archivio ha una data non valida e non può essere attribuito a un giorno o a un mese.' : `${report.dateNonValide} appuntamenti confermati nell’archivio hanno una data non valida e non possono essere attribuiti a un giorno o a un mese.`}</p>}
        <section className="report-section" aria-labelledby="report-trend-title"><header><div><h2 id="report-trend-title">Il mese giorno per giorno</h2><p>{nomeMese(mese)} · Seleziona una barra per consultare il giorno.</p></div></header><div className="report-chart-scroll"><div className="report-chart" style={{ gridTemplateColumns: `repeat(${report.giorni.length}, minmax(20px, 1fr))` }} role="group" aria-label="Valori giornalieri degli appuntamenti confermati">{report.giorni.map(g => <button type="button" key={g.data} className={`report-chart-day ${g.data === giorno ? 'selected' : ''} ${g.senzaPrezzo ? 'incomplete' : ''}`} onClick={() => setGiorno(g.data)} aria-pressed={g.data === giorno} aria-label={`${formattaData(g.data)}: ${importo(g)}, ${g.confermati} confermati${g.senzaPrezzo ? `, ${g.senzaPrezzo} senza prezzo` : ''}`} title={`${formattaData(g.data)}: ${importo(g)}${g.senzaPrezzo ? ' · totale incompleto' : ''}`}><span className="report-chart-track"><span className="report-chart-bar" style={{ height: `${Math.max(g.centesimi ? 4 : 0, g.centesimi / massimo * 100)}%` }} />{g.senzaPrezzo > 0 && <span className="report-chart-missing" aria-hidden="true">?</span>}</span><span className="report-chart-label">{Number(g.data.slice(8))}</span></button>)}</div></div><p className="report-chart-caption">Le barre rappresentano solo gli importi disponibili al listino attuale.{report.senzaPrezzo > 0 ? ' Il simbolo ? segnala prezzi mancanti.' : ''}</p></section>
        <div className="report-grid"><section className="report-section" aria-labelledby="report-days-title"><header><div><h2 id="report-days-title">Riepilogo giornaliero</h2><p>Valori informativi del mese selezionato.</p></div><label className="report-checkbox"><input type="checkbox" checked={mostraTutti} onChange={e => setMostraTutti(e.target.checked)} />Mostra anche i giorni senza confermati</label></header>{giorniVisibili.length ? <div className="table-responsive"><table className="table report-days-table"><thead><tr><th>Giorno</th><th>Confermati</th><th>Valore stimato</th></tr></thead><tbody>{giorniVisibili.map(g => <tr key={g.data} className={g.data === giorno ? 'report-selected-row' : ''}><td><button type="button" className="report-date-link" onClick={() => setGiorno(g.data)} aria-label={`Consulta ${formattaData(g.data)}`}>{formattaData(g.data)}</button></td><td>{g.confermati}</td><td><strong>{importo(g)}</strong>{g.senzaPrezzo > 0 && <span className="report-partial">{g.senzaPrezzo} senza prezzo</span>}</td></tr>)}</tbody></table></div> : <p className="report-empty">Nessun appuntamento confermato nel mese selezionato.</p>}</section>
        <section className="report-section" aria-labelledby="report-detail-title"><header><div><h2 id="report-detail-title">Dettaglio del giorno</h2><p>{formattaData(giorno, { year: 'numeric' })}</p></div></header>{selezionato.appuntamenti.length ? <ul className="report-appointments">{selezionato.appuntamenti.map(app => <li key={app.id}><div className="report-appointment-info"><span>{app.ora || 'Orario non indicato'}</span><strong>{app.clienteNome || 'Cliente non indicato'}</strong><p>{app.servizioNome || 'Servizio non indicato'}</p><small>{app.operatoreNome || 'Operatore non indicato'}</small><Link to={`/appuntamenti?${new URLSearchParams({ data: giorno, apri: app.id })}`}>Apri appuntamento<FiArrowRight aria-hidden="true" /></Link></div><div className="report-appointment-value"><strong>{app.centesimi === null ? 'Prezzo non disponibile' : euro(app.centesimi)}</strong><small>{app.centesimi === null ? 'Escluso dalla somma' : 'Listino attuale'}</small></div></li>)}</ul> : <p className="report-empty">Nessun appuntamento confermato in questa giornata.</p>}</section></div>
      </>}
    </div>
  )
}
