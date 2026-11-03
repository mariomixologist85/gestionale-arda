import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { Modal } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import { FiAlertCircle, FiArrowRight, FiCalendar, FiClock, FiEdit2, FiFileText, FiMail, FiPhone, FiUser } from 'react-icons/fi'
import { API_BASE_URL } from '../config.js'
import { nomeCompleto } from '../utils/ricerca.js'
import { dataCentro, dataValida, fineAppuntamento, formattaData, minutiCentro, minutiOra, orarioFine } from '../utils/giornata.js'
import './SchedaCliente.css'

const vuoto = () => ({ elementi: [], caricamento: true, errore: '' })
const ordine = (a, b) => `${a.data || ''} ${a.ora || ''}`.localeCompare(`${b.data || ''} ${b.ora || ''}`)
const etichetteStato = { confermato: 'Confermato', completato: 'Completato', annullato: 'Annullato', pending: 'In attesa' }

function dataLeggibile(data) {
  return dataValida(data) ? formattaData(data, { year: 'numeric' }) : data || 'Data non indicata'
}

function Elenco({ titolo, id, stato, elementi, vuotoTesto, trattamenti = false, onHide, onRiprova }) {
  const [limite, setLimite] = useState(10)
  return (
    <section className="customer-history-section" aria-labelledby={id}>
      <header><h3 id={id}>{trattamenti ? <FiFileText aria-hidden="true" /> : <FiCalendar aria-hidden="true" />}{titolo}</h3>{!stato.caricamento && !stato.errore && <span className="customer-count" aria-label={`${elementi.length} ${trattamenti ? 'trattamenti' : 'appuntamenti'}`}>{elementi.length}</span>}</header>
      {stato.caricamento ? <p className="customer-history-message" role="status">Caricamento…</p> : stato.errore ? <div className="customer-history-error" role="alert"><p>{stato.errore}</p><button type="button" className="customer-text-button" onClick={onRiprova}>Riprova</button></div> : elementi.length === 0 ? <p className="customer-history-message">{vuotoTesto}</p> : <>
        <ol className="customer-history-list">
          {elementi.slice(0, limite).map(elemento => (
            <li key={elemento.id}>
              <div className="customer-history-date"><strong>{dataLeggibile(elemento.data)}</strong>{!trattamenti && <span><FiClock aria-hidden="true" />{elemento.ora || 'Orario non indicato'}{minutiOra(elemento.ora) !== null && fineAppuntamento(elemento) !== null ? ` – ${orarioFine(elemento)}` : ''}</span>}</div>
              <div className="customer-history-description"><strong>{elemento.servizioNome || 'Trattamento non indicato'}</strong><span><FiUser aria-hidden="true" />{elemento.operatoreNome || 'Operatore non indicato'}{!trattamenti && elemento.durata ? ` · ${elemento.durata} min` : ''}</span>{elemento.note && <p><b>Note:</b> {elemento.note}</p>}</div>
              <div className="customer-history-actions">{trattamenti ? (elemento.prezzo !== undefined && elemento.prezzo !== null && elemento.prezzo !== '' && Number.isFinite(Number(elemento.prezzo)) ? <strong className="customer-price">{new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(Number(elemento.prezzo))}</strong> : <span>Importo non indicato</span>) : <><span className={`customer-status customer-status-${Object.hasOwn(etichetteStato, elemento.stato) ? elemento.stato : 'altro'}`}>{etichetteStato[elemento.stato] || elemento.stato || 'Stato non indicato'}</span>{dataValida(elemento.data) && <Link to={`/appuntamenti?${new URLSearchParams({ data: elemento.data, apri: elemento.id })}`} onClick={onHide} aria-label={`Apri nel calendario l’appuntamento del ${dataLeggibile(elemento.data)} alle ${elemento.ora || 'ora non indicata'}`}>Apri nel calendario<FiArrowRight aria-hidden="true" /></Link>}</>}</div>
            </li>
          ))}
        </ol>
        {elementi.length > limite && <button type="button" className="customer-more" onClick={() => setLimite(n => n + 10)}>Mostra altri ({elementi.length - limite})</button>}
      </>}
    </section>
  )
}

export default function SchedaCliente({ cliente, onHide, onModifica }) {
  const [appuntamenti, setAppuntamenti] = useState(vuoto)
  const [trattamenti, setTrattamenti] = useState(vuoto)
  const [ricaricaAppuntamenti, setRicaricaAppuntamenti] = useState(0)
  const [ricaricaTrattamenti, setRicaricaTrattamenti] = useState(0)
  const [ora, setOra] = useState(() => new Date())

  useEffect(() => {
    const timer = setInterval(() => setOra(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    setAppuntamenti(vuoto())
    axios.get(`${API_BASE_URL}/api/appuntamenti`, { params: { clienteId: cliente.id }, signal: controller.signal })
      .then(res => {
        if (!Array.isArray(res.data)) throw new Error('Risposta non valida')
        if (!controller.signal.aborted) setAppuntamenti({ elementi: res.data.filter(a => String(a.clienteId) === String(cliente.id)), caricamento: false, errore: '' })
      }).catch(() => {
        if (!controller.signal.aborted) setAppuntamenti({ elementi: [], caricamento: false, errore: 'Non riesco a caricare gli appuntamenti del cliente.' })
      })
    return () => controller.abort()
  }, [cliente.id, ricaricaAppuntamenti])

  useEffect(() => {
    const controller = new AbortController()
    setTrattamenti(vuoto())
    axios.get(`${API_BASE_URL}/api/trattamenti`, { params: { clienteId: cliente.id }, signal: controller.signal })
      .then(res => {
        if (!Array.isArray(res.data)) throw new Error('Risposta non valida')
        if (!controller.signal.aborted) setTrattamenti({ elementi: res.data.filter(t => String(t.clienteId) === String(cliente.id)).sort((a, b) => ordine(b, a)), caricamento: false, errore: '' })
      }).catch(() => {
        if (!controller.signal.aborted) setTrattamenti({ elementi: [], caricamento: false, errore: 'Non riesco a caricare lo storico trattamenti del cliente.' })
      })
    return () => controller.abort()
  }, [cliente.id, ricaricaTrattamenti])

  const { prossimi, passati, senzaData } = useMemo(() => {
    const oggi = dataCentro(ora), minuti = minutiCentro(ora)
    const gruppi = { prossimi: [], passati: [], senzaData: [] }
    for (const app of appuntamenti.elementi) {
      if (!dataValida(app.data)) { gruppi.senzaData.push(app); continue }
      const termine = fineAppuntamento(app) ?? minutiOra(app.ora)
      const passato = app.data < oggi || (app.data === oggi && termine !== null && termine <= minuti)
      gruppi[passato ? 'passati' : 'prossimi'].push(app)
    }
    gruppi.prossimi.sort(ordine)
    gruppi.passati.sort((a, b) => ordine(b, a))
    return gruppi
  }, [appuntamenti.elementi, ora])

  const nome = nomeCompleto(cliente)
  const iniziali = `${String(cliente.nome || '').charAt(0)}${String(cliente.cognome || '').charAt(0)}`
  const riprovaAppuntamenti = () => setRicaricaAppuntamenti(n => n + 1)
  return (
    <Modal show onHide={onHide} size="xl" scrollable className="customer-sheet" aria-labelledby="customer-sheet-title">
      <Modal.Header closeButton><div className="customer-sheet-heading"><span className="customer-sheet-avatar" aria-hidden="true">{iniziali}</span><div><p>Scheda cliente</p><Modal.Title as="h2" id="customer-sheet-title">{nome}</Modal.Title></div></div></Modal.Header>
      <Modal.Body>
        <div className="customer-contact-grid">
          <section className="customer-contact"><h3>Contatti</h3><dl><div><dt><FiPhone aria-hidden="true" />Telefono</dt><dd>{cliente.telefono ? <a href={`tel:${String(cliente.telefono).replace(/[^\d+]/g, '')}`}>{cliente.telefono}</a> : 'Non indicato'}</dd></div><div><dt><FiMail aria-hidden="true" />Email</dt><dd>{cliente.email ? <a href={`mailto:${cliente.email}`}>{cliente.email}</a> : 'Non indicata'}</dd></div><div><dt>Data di nascita</dt><dd>{cliente.dataNascita ? dataLeggibile(cliente.dataNascita) : 'Non indicata'}</dd></div></dl></section>
          <div className="customer-notes-column"><section className="customer-allergies"><h3><FiAlertCircle aria-hidden="true" />Allergie e sensibilità</h3><p>{cliente.allergie || 'Nessuna informazione registrata.'}</p></section><section className="customer-notes"><h3><FiFileText aria-hidden="true" />Note cliente</h3><p>{cliente.note || 'Nessuna nota registrata.'}</p></section></div>
        </div>
        <p className="customer-history-intro">Appuntamenti e trattamenti già registrati per questo cliente. Gli appuntamenti annullati restano visibili con il relativo stato.</p>
        <Elenco titolo="Appuntamenti di oggi e futuri" id="customer-upcoming" stato={appuntamenti} elementi={prossimi} vuotoTesto="Nessun appuntamento di oggi o futuro registrato." onHide={onHide} onRiprova={riprovaAppuntamenti} />
        <Elenco titolo="Appuntamenti passati" id="customer-past" stato={appuntamenti} elementi={passati} vuotoTesto="Nessun appuntamento passato registrato." onHide={onHide} onRiprova={riprovaAppuntamenti} />
        {senzaData.length > 0 && <Elenco titolo="Appuntamenti con data da verificare" id="customer-undated" stato={appuntamenti} elementi={senzaData} vuotoTesto="" onHide={onHide} onRiprova={riprovaAppuntamenti} />}
        <Elenco titolo="Storico trattamenti" id="customer-treatments" stato={trattamenti} elementi={trattamenti.elementi} vuotoTesto="Nessun trattamento registrato nello storico." trattamenti onHide={onHide} onRiprova={() => setRicaricaTrattamenti(n => n + 1)} />
      </Modal.Body>
      <Modal.Footer><span className="customer-readonly">La consultazione non modifica i dati.</span><button type="button" className="customer-edit-button" onClick={onModifica}><FiEdit2 aria-hidden="true" />Modifica anagrafica</button><button type="button" className="customer-close-button" onClick={onHide}>Chiudi scheda</button></Modal.Footer>
    </Modal>
  )
}
