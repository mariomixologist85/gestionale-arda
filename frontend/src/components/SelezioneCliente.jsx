import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Form } from 'react-bootstrap'
import { FaSearch, FaTimes } from 'react-icons/fa'
import { corrisponde, nomeCompleto, normalizza } from '../utils/ricerca.js'

const MAX_RISULTATI = 50

const etichetta = nomeCompleto

function chiaveOrdinamento(cliente) {
  return normalizza(`${cliente.cognome} ${cliente.nome}`)
}

function SelezioneCliente({ clienti, value, onSelect, placeholder }) {
  const [testo, setTesto] = useState('')
  const [aperto, setAperto] = useState(false)
  const [evidenziato, setEvidenziato] = useState(-1)
  const contenitoreRef = useRef(null)

  const clienteSelezionato = clienti.find(c => c.id === value) || null

  useEffect(() => {
    if (!aperto) {
      setTesto(clienteSelezionato ? etichetta(clienteSelezionato) : '')
      setEvidenziato(-1)
    }
  }, [clienteSelezionato, aperto])

  useEffect(() => {
    if (!aperto) return undefined
    const chiudi = (event) => {
      if (contenitoreRef.current && !contenitoreRef.current.contains(event.target)) {
        setAperto(false)
      }
    }
    document.addEventListener('mousedown', chiudi)
    return () => document.removeEventListener('mousedown', chiudi)
  }, [aperto])

  useEffect(() => {
    if (evidenziato < 0) return
    contenitoreRef.current
      ?.querySelector('.ricerca-cliente-voce.evidenziata')
      ?.scrollIntoView({ block: 'nearest' })
  }, [evidenziato])

  const risultati = useMemo(() => {
    const ordinati = [...clienti].sort((a, b) =>
      chiaveOrdinamento(a).localeCompare(chiaveOrdinamento(b), 'it')
    )
    return ordinati.filter(cliente => corrisponde([etichetta(cliente), cliente.telefono], testo))
  }, [clienti, testo])

  const visibili = risultati.slice(0, MAX_RISULTATI)

  const seleziona = (cliente) => {
    onSelect(cliente)
    setTesto(etichetta(cliente))
    setAperto(false)
    setEvidenziato(-1)
  }

  const annulla = () => {
    onSelect(null)
    setTesto('')
    setEvidenziato(-1)
    contenitoreRef.current?.querySelector('input')?.focus()
  }

  const gestisciTastiera = (event) => {
    if (event.key === 'Escape') {
      setAperto(false)
      return
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!aperto) {
        setAperto(true)
        setEvidenziato(0)
        return
      }
      if (visibili.length === 0) return
      const passo = event.key === 'ArrowDown' ? 1 : -1
      setEvidenziato((indice) => {
        const prossimo = indice + passo
        if (prossimo < 0) return visibili.length - 1
        if (prossimo >= visibili.length) return 0
        return prossimo
      })
      return
    }
    if (event.key === 'Enter' && aperto && visibili.length > 0) {
      // Senza preventDefault il form dell'appuntamento verrebbe inviato
      event.preventDefault()
      seleziona(visibili[evidenziato >= 0 ? evidenziato : 0])
    }
  }

  return (
    <div className="ricerca-cliente" ref={contenitoreRef}>
      <div className="ricerca-cliente-input">
        <FaSearch className="ricerca-cliente-icon" />
        <Form.Control
          type="text"
          value={testo}
          onChange={(event) => {
            setTesto(event.target.value)
            setAperto(true)
            setEvidenziato(-1)
          }}
          onFocus={() => {
            setAperto(true)
            setEvidenziato(-1)
          }}
          onKeyDown={gestisciTastiera}
          placeholder={placeholder || 'Cerca cliente per nome, cognome o telefono...'}
          autoComplete="off"
          role="combobox"
          aria-expanded={aperto}
          aria-controls="ricerca-cliente-lista"
          aria-autocomplete="list"
        />
        {clienteSelezionato && (
          <button
            type="button"
            className="ricerca-cliente-clear"
            onClick={annulla}
            aria-label="Annulla cliente selezionato"
          >
            <FaTimes />
          </button>
        )}
      </div>

      {aperto && (
        <ul className="ricerca-cliente-lista" id="ricerca-cliente-lista" role="listbox">
          {visibili.map((cliente, indice) => (
            <li
              key={cliente.id}
              role="option"
              aria-selected={cliente.id === value}
              className={[
                'ricerca-cliente-voce',
                indice === evidenziato ? 'evidenziata' : '',
                cliente.id === value ? 'selezionata' : ''
              ].filter(Boolean).join(' ')}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setEvidenziato(indice)}
              onClick={() => seleziona(cliente)}
            >
              <span className="voce-nome">{etichetta(cliente)}</span>
              {cliente.telefono && <span className="voce-telefono">{cliente.telefono}</span>}
            </li>
          ))}
          {risultati.length === 0 && (
            <li className="ricerca-cliente-vuoto">Nessun cliente trovato</li>
          )}
          {risultati.length > visibili.length && (
            <li className="ricerca-cliente-altro">
              …altri {risultati.length - visibili.length} clienti: continua a digitare
            </li>
          )}
        </ul>
      )}
    </div>
  )
}

export default SelezioneCliente
