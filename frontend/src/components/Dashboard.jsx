import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { Link } from 'react-router-dom'
import { FiArrowRight, FiCalendar, FiCheck, FiChevronLeft, FiChevronRight, FiClock, FiMessageCircle, FiPlus, FiSearch, FiSun, FiUser } from 'react-icons/fi'
import { API_BASE_URL } from '../config.js'
import { corrisponde } from '../utils/ricerca.js'
import { daConfermare, dataCentro, dataValida, fineAppuntamento, formattaData, minutiCentro, minutiOra, orarioFine, spostaGiorno } from '../utils/giornata.js'

function Stato({ app }) {
  const tipo = app.stato === 'completato' ? 'completato' : app.stato === 'annullato' ? 'annullato' : daConfermare(app) ? 'attesa' : app.stato === 'confermato' ? 'confermato' : 'altro'
  const etichetta = { completato: 'Completato', annullato: 'Annullato', attesa: 'Da confermare', confermato: 'Confermato' }[tipo] || app.stato || 'Non specificato'
  return <span className={`day-badge day-badge-${tipo}`}>{tipo === 'completato' ? <FiCheck aria-hidden="true" /> : <i aria-hidden="true" />}{etichetta}</span>
}

export default function Dashboard() {
  const [data, setData] = useState(() => dataCentro())
  const [ora, setOra] = useState(() => new Date())
  const [appuntamenti, setAppuntamenti] = useState([])
  const [caricamento, setCaricamento] = useState(true)
  const [errore, setErrore] = useState('')
  const [ricerca, setRicerca] = useState('')
  const [filtro, setFiltro] = useState('tutti')
  const [tentativo, setTentativo] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => setOra(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    setCaricamento(true)
    setErrore('')
    setAppuntamenti([])
    axios.get(`${API_BASE_URL}/api/appuntamenti`, { params: { data }, signal: controller.signal })
      .then(res => {
        if (!Array.isArray(res.data)) throw new Error('Risposta non valida')
        if (!controller.signal.aborted) setAppuntamenti(res.data)
      })
      .catch(err => {
        if (!controller.signal.aborted) setErrore('Non riesco a caricare l’agenda. Riprova tra qualche istante.')
      })
      .finally(() => { if (!controller.signal.aborted) setCaricamento(false) })
    return () => controller.abort()
  }, [data, tentativo])

  const ordinati = useMemo(() => [...appuntamenti].sort((a, b) => String(a.ora || '').localeCompare(String(b.ora || ''))), [appuntamenti])
  const inAttesa = ordinati.filter(daConfermare)
  const completati = ordinati.filter(a => a.stato === 'completato').length
  const oggi = dataCentro(ora)
  const minutiAdesso = minutiCentro(ora)
  const prossimo = data < oggi ? null : ordinati.find(a => {
    if (['annullato', 'completato'].includes(a.stato)) return false
    const fine = fineAppuntamento(a)
    return fine !== null && (data > oggi || fine > minutiAdesso)
  })
  const inCorso = prossimo && data === oggi && minutiOra(prossimo.ora) <= minutiAdesso
  const visibili = ordinati.filter(app => {
    const statoCorrisponde = filtro === 'tutti' || (filtro === 'attesa' ? daConfermare(app) : app.stato === filtro && (filtro !== 'confermato' || !daConfermare(app)))
    return statoCorrisponde && corrisponde([app.clienteNome, app.servizioNome, app.operatoreNome], ricerca)
  })
  const urlAgenda = `/appuntamenti?${new URLSearchParams({ data })}`
  const urlAppuntamento = app => `/appuntamenti?${new URLSearchParams({ data, apri: app.id })}`
  const titoloAgenda = data === oggi ? 'L’agenda di oggi' : `L’agenda del ${formattaData(data)}`
  const cambiaData = nuovaData => {
    if (!dataValida(nuovaData) || nuovaData < '1900-01-01' || nuovaData > '9999-12-30') return
    setData(nuovaData); setRicerca(''); setFiltro('tutti')
  }
  const valore = numero => caricamento || errore ? '—' : numero

  return (
    <div className="arda-day">
      <header className="day-heading">
        <div><p className="day-eyebrow">Ogni giorno, con cura</p><h1>La tua giornata</h1><p>Appuntamenti, persone e piccoli dettagli da seguire.</p></div>
        <div className="day-heading-actions">
          <Link className="day-button day-button-secondary" to="/clienti?nuovo=1"><FiUser aria-hidden="true" />Nuovo cliente</Link>
          <Link className="day-button day-button-primary" to={`${urlAgenda}&nuovo=1`}><FiPlus aria-hidden="true" />Nuovo appuntamento</Link>
        </div>
      </header>

      <section className="day-metrics" aria-label="Riepilogo della giornata" aria-busy={caricamento}>
        {[{ icona: FiCalendar, titolo: data === oggi ? 'Appuntamenti oggi' : 'Appuntamenti del giorno', numero: ordinati.length, nota: 'nella tua agenda' }, { icona: FiMessageCircle, titolo: 'Da confermare', numero: inAttesa.length, nota: 'risposte da registrare' }, { icona: FiCheck, titolo: 'Completati', numero: completati, nota: `su ${ordinati.length} appuntamenti` }].map(({ icona: Icona, titolo, numero, nota }) => (
          <div className="day-metric" key={titolo}><span className="day-metric-icon"><Icona aria-hidden="true" /></span><div><span className="day-metric-label">{titolo}</span><strong>{valore(numero)}</strong><small>{!caricamento && !errore ? nota : 'Dati non disponibili'}</small></div></div>
        ))}
      </section>

      <div className="day-grid">
        <section className="day-agenda" aria-labelledby="day-agenda-title" aria-busy={caricamento}>
          <header className="day-agenda-header"><div><h2 id="day-agenda-title">{titoloAgenda}</h2><p>Un momento dedicato a ogni persona.</p></div>
            <div className="day-date-controls">
              <button type="button" aria-label="Giorno precedente" disabled={data <= '1900-01-01'} onClick={() => cambiaData(spostaGiorno(data, -1))}><FiChevronLeft aria-hidden="true" /></button>
              <label className="visually-hidden" htmlFor="day-date">Data dell’agenda</label><input id="day-date" type="date" value={data} min="1900-01-01" max="9999-12-30" onChange={e => { if (e.target.value && e.target.validity.valid) cambiaData(e.target.value) }} />
              <button type="button" aria-label="Giorno successivo" disabled={data >= '9999-12-30'} onClick={() => cambiaData(spostaGiorno(data, 1))}><FiChevronRight aria-hidden="true" /></button>
            </div>
          </header>
          <div className="day-tools"><div className="day-search"><FiSearch aria-hidden="true" /><input type="search" aria-label="Cerca appuntamento" placeholder="Cerca cliente o trattamento…" value={ricerca} onChange={e => setRicerca(e.target.value)} /></div><select aria-label="Filtra appuntamenti" value={filtro} onChange={e => setFiltro(e.target.value)}><option value="tutti">Tutti gli stati</option><option value="attesa">Da confermare</option><option value="confermato">Confermati</option><option value="completato">Completati</option><option value="annullato">Annullati</option></select></div>
          {caricamento ? <div className="day-empty" role="status"><FiCalendar aria-hidden="true" /><p>Caricamento dell’agenda…</p></div> : errore ? <div className="day-empty day-error" role="alert"><p>{errore}</p><button className="day-button day-button-secondary" onClick={() => setTentativo(n => n + 1)}>Riprova</button></div> : visibili.length === 0 ? <div className="day-empty"><FiCalendar aria-hidden="true" /><h3>{ordinati.length ? 'Nessun risultato' : 'La tua agenda è libera'}</h3><p>{ordinati.length ? 'Prova un’altra ricerca o modifica il filtro.' : 'Non ci sono appuntamenti registrati per questa data.'}</p>{ordinati.length ? <button className="day-text-link" onClick={() => { setRicerca(''); setFiltro('tutti') }}>Azzera i filtri</button> : <Link className="day-text-link" to={`${urlAgenda}&nuovo=1`}>Aggiungi un appuntamento<FiPlus aria-hidden="true" /></Link>}</div> : (
            <div className="day-table" role="table" aria-label="Appuntamenti della giornata"><div role="rowgroup"><div className="day-table-heading" role="row">{['Orario', 'Cliente', 'Trattamento', 'Operatore', 'Stato', 'Dettagli'].map(t => <span role="columnheader" key={t} className={t === 'Operatore' ? 'day-operator-heading' : t === 'Dettagli' ? 'visually-hidden' : ''}>{t}</span>)}</div></div><div role="rowgroup">{visibili.map(app => {
              const evidenziato = prossimo?.id === app.id
              const iniziali = String(app.clienteNome || '').trim().split(/\s+/).slice(0, 2).map(n => n.charAt(0)).join('') || '—'
              return <div key={app.id} className={`day-row ${evidenziato ? 'day-row-next' : ''}`} role="row"><div className="day-time" role="cell"><strong>{app.ora || '—'}</strong><span>{orarioFine(app)}</span></div><div className="day-client" role="cell"><span className="day-avatar" aria-hidden="true">{iniziali}</span><div><strong>{app.clienteNome || 'Cliente non indicato'}</strong>{evidenziato && <span>{inCorso ? 'In corso' : 'Prossimo appuntamento'}</span>}</div></div><div className="day-treatment" role="cell"><strong>{app.servizioNome || 'Trattamento non indicato'}</strong><span>{app.durata ? `${app.durata} min` : 'Durata non indicata'}</span></div><div className="day-operator" role="cell"><i aria-hidden="true" />{app.operatoreNome || '—'}</div><div className="day-status" role="cell"><Stato app={app} /></div><div className="day-row-action" role="cell"><Link to={urlAppuntamento(app)} aria-label={`Apri appuntamento ${app.clienteNome || ''} delle ${app.ora || ''}`}><FiChevronRight aria-hidden="true" /></Link></div></div>
            })}</div></div>
          )}
          <footer className="day-agenda-footer"><span>{caricamento || errore ? 'Agenda del centro' : `${visibili.length} ${visibili.length === 1 ? 'appuntamento' : 'appuntamenti'} in agenda`}</span><Link className="day-text-link" to={urlAgenda}>Apri il calendario<FiArrowRight aria-hidden="true" /></Link></footer>
        </section>

        <aside className="day-right">
          <section className="day-next"><p className="day-eyebrow"><FiClock aria-hidden="true" />{inCorso ? 'Appuntamento in corso' : 'Il prossimo appuntamento'}</p>{caricamento ? <p role="status">Caricamento…</p> : errore ? <p>Dati non disponibili.</p> : prossimo ? <><div className="day-next-time"><strong>{prossimo.ora}</strong><span>— {orarioFine(prossimo)}</span></div><h2>{prossimo.clienteNome || 'Cliente non indicato'}</h2><p>{prossimo.servizioNome || 'Trattamento non indicato'}</p><div className="day-next-details"><FiUser aria-hidden="true" />{prossimo.operatoreNome || 'Operatore non indicato'}<span>·</span>{prossimo.durata || '—'} min</div><Link className="day-button day-button-secondary" to={urlAppuntamento(prossimo)}>Apri appuntamento<FiArrowRight aria-hidden="true" /></Link></> : <><h2 className="day-next-empty">Nessun appuntamento in arrivo</h2><p>{data < oggi ? 'Stai consultando una giornata passata.' : 'Per la data selezionata non ci sono altri appuntamenti in programma.'}</p></>}</section>
          <section className="day-confirm"><h2>Da confermare</h2><p>Controlla la risposta su WhatsApp e registrala nell’appuntamento.</p>{caricamento ? <p role="status">Caricamento…</p> : errore ? <p>Dati non disponibili.</p> : inAttesa.length ? <>{inAttesa.slice(0, 4).map(app => <div className="day-pending" key={app.id}><div><strong>{app.clienteNome || 'Cliente non indicato'}</strong><span>{app.ora} · {app.servizioNome}</span></div><Link to={urlAppuntamento(app)} aria-label={`Apri conferma di ${app.clienteNome || 'questo appuntamento'}`}><FiChevronRight aria-hidden="true" /></Link></div>)}{inAttesa.length > 4 && <button className="day-text-link" onClick={() => setFiltro('attesa')}>Mostra tutti ({inAttesa.length})<FiArrowRight aria-hidden="true" /></button>}</> : <p className="day-all-confirmed"><FiCheck aria-hidden="true" />Nessuna conferma in attesa.</p>}</section>
          <div className="day-wellness"><FiSun aria-hidden="true" /><p>La cura comincia<br />dalle piccole attenzioni.</p></div>
        </aside>
      </div>
    </div>
  )
}
