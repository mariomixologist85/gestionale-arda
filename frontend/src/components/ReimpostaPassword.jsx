import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { Card, Form, Button, Alert, Spinner } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import { FaLock, FaArrowLeft } from 'react-icons/fa'
import { API_BASE_URL } from '../config.js'

const LUNGHEZZA_MINIMA = 10

function ReimpostaPassword() {
  const token = new URLSearchParams(window.location.search).get('token') || ''
  const [stato, setStato] = useState(token ? 'verifica' : 'nonvalido')
  const [username, setUsername] = useState('')
  const [valori, setValori] = useState({ nuovaPassword: '', conferma: '' })
  const [errore, setErrore] = useState(token ? '' : 'Collegamento mancante: richiedi un nuovo recupero password')
  const [esito, setEsito] = useState(null)

  useEffect(() => {
    if (!token) return
    let attiva = true
    axios.get(`${API_BASE_URL}/api/recupera-password/${encodeURIComponent(token)}`)
      .then(res => {
        if (!attiva) return
        setUsername(res.data.username || '')
        setStato('valido')
      })
      .catch(err => {
        if (!attiva) return
        setErrore(err.response?.data?.error || 'Collegamento non valido o scaduto')
        setStato('nonvalido')
      })
    return () => { attiva = false }
  }, [token])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrore('')
    if (valori.nuovaPassword !== valori.conferma) {
      setErrore('La conferma non corrisponde alla nuova password')
      return
    }
    try {
      const res = await axios.post(`${API_BASE_URL}/api/reimposta-password`, {
        token,
        nuovaPassword: valori.nuovaPassword
      })
      setEsito(res.data)
      setStato('fatto')
    } catch (err) {
      setErrore(err.response?.data?.error || 'Errore durante il salvataggio della password')
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #2C1810 0%, #1A0F0A 50%, #2C1810 100%)',
      padding: '1rem'
    }}>
      <Card style={{
        width: '100%',
        maxWidth: '460px',
        borderRadius: '16px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
        border: '1px solid rgba(201, 169, 97, 0.2)'
      }}>
        <Card.Body style={{ padding: '2.5rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <img
              src="/logo.jpg"
              alt="Arda Logo"
              style={{ width: '90px', height: '90px', objectFit: 'contain', marginBottom: '0.75rem' }}
            />
            <h2 style={{ fontWeight: 700, marginBottom: '0.25rem', color: '#2C1810', letterSpacing: '2px' }}>ARDA</h2>
            <p style={{ color: '#6B5B4F', fontSize: '0.85rem', letterSpacing: '1px', textTransform: 'uppercase' }}>
              Nuova password
            </p>
          </div>

          {stato === 'verifica' && (
            <div style={{ textAlign: 'center', padding: '1.5rem 0', color: '#6B5B4F' }}>
              <Spinner animation="border" size="sm" className="me-2" />
              Verifica del collegamento…
            </div>
          )}

          {stato === 'nonvalido' && (
            <>
              <Alert variant="danger" style={{ borderRadius: '8px' }}>{errore}</Alert>
              <Link to="/" className="btn btn-primary w-100" style={{ borderRadius: '8px' }}>
                <FaArrowLeft className="me-2" />Torna al login
              </Link>
            </>
          )}

          {stato === 'fatto' && (
            <>
              <Alert variant="success" style={{ borderRadius: '8px' }}>
                Password aggiornata.
                {esito?.sessioniChiuse > 0 && ' Tutte le sessioni che erano aperte sono state chiuse.'}
              </Alert>
              <Link to="/" className="btn btn-primary w-100" style={{ borderRadius: '8px' }}>
                Vai al login
              </Link>
            </>
          )}

          {stato === 'valido' && (
            <>
              {errore && <Alert variant="danger" style={{ borderRadius: '8px' }}>{errore}</Alert>}
              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label style={{ fontWeight: 500 }}>
                    <FaLock className="me-2" />Account
                  </Form.Label>
                  <Form.Control type="text" value={username} readOnly style={{ borderRadius: '8px' }} />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label style={{ fontWeight: 500 }}>Nuova password *</Form.Label>
                  <Form.Control
                    type="password"
                    value={valori.nuovaPassword}
                    onChange={(e) => setValori({ ...valori, nuovaPassword: e.target.value })}
                    minLength={LUNGHEZZA_MINIMA}
                    autoComplete="new-password"
                    required
                    style={{ borderRadius: '8px', padding: '0.75rem' }}
                  />
                  <Form.Text className="text-muted">Almeno {LUNGHEZZA_MINIMA} caratteri</Form.Text>
                </Form.Group>
                <Form.Group className="mb-4">
                  <Form.Label style={{ fontWeight: 500 }}>Conferma nuova password *</Form.Label>
                  <Form.Control
                    type="password"
                    value={valori.conferma}
                    onChange={(e) => setValori({ ...valori, conferma: e.target.value })}
                    minLength={LUNGHEZZA_MINIMA}
                    autoComplete="new-password"
                    required
                    style={{ borderRadius: '8px', padding: '0.75rem' }}
                  />
                </Form.Group>
                <Button
                  variant="primary"
                  type="submit"
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', fontWeight: 600, background: '#C9A961', border: 'none', color: '#2C1810' }}
                >
                  Imposta la nuova password
                </Button>
              </Form>
              <p className="text-muted mt-3 mb-0" style={{ fontSize: '0.85rem', textAlign: 'center' }}>
                Al salvataggio tutte le sessioni aperte di questo account verranno chiuse.
              </p>
            </>
          )}
        </Card.Body>
      </Card>
    </div>
  )
}

export default ReimpostaPassword
