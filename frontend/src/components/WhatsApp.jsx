import React, { useState } from 'react'
import axios from 'axios'
import { Card, Alert, Form, Button } from 'react-bootstrap'
import { FaWhatsapp, FaCheckCircle, FaInfoCircle } from 'react-icons/fa'

function WhatsApp() {
  const [numero, setNumero] = useState('')
  const [messaggio, setMessaggio] = useState('')

  const handleInvia = (e) => {
    e.preventDefault()
    
    if (!numero || !messaggio) {
      alert('Inserisci numero e messaggio')
      return
    }

    // Crea il link WhatsApp
    const numeroPulito = numero.replace(/\D/g, '')
    const messaggioCodificato = encodeURIComponent(messaggio)
    const link = `https://wa.me/${numeroPulito}?text=${messaggioCodificato}`
    
    // Apri WhatsApp in una nuova scheda
    window.open(link, '_blank')
  }

  return (
    <div>
      <div className="page-header">
        <h1>WhatsApp</h1>
        <p>Invio messaggi tramite link WhatsApp</p>
      </div>

      {/* Info Sistema */}
      <Card className="mb-4">
        <Card.Header>
          <h5 className="card-title mb-0">
            <FaCheckCircle className="me-2" style={{ color: '#25D366' }} />
            Sistema Link WhatsApp
          </h5>
        </Card.Header>
        <Card.Body>
          <Alert variant="info" style={{ borderRadius: '8px', background: '#F9F5F0', border: '1px solid #E8D5B7' }}>
            <FaInfoCircle className="me-2" />
            <strong>Come funziona:</strong>
            <ul className="mb-0 mt-2">
              <li>Clicca il bottone WhatsApp accanto a ogni appuntamento</li>
              <li>Si apre WhatsApp (web o app) con il messaggio già pronto</li>
              <li>Clicca <strong>Invia</strong> per inviare il messaggio</li>
              <li>Il cliente può rispondere SI per confermare o NO per annullare</li>
            </ul>
          </Alert>
        </Card.Body>
      </Card>

      {/* Invio Messaggio Manuale */}
      <Card>
        <Card.Header>
          <h5 className="card-title mb-0">
            <FaWhatsapp className="me-2" style={{ color: '#25D366' }} />
            Invia Messaggio Manuale
          </h5>
        </Card.Header>
        <Card.Body>
          <Form onSubmit={handleInvia}>
            <Form.Group className="mb-3">
              <Form.Label>Numero di telefono *</Form.Label>
              <Form.Control
                type="tel"
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                placeholder="+39 333 1234567"
                required
              />
              <Form.Text className="text-muted">
                Includi il prefisso internazionale (es. +39 per Italia)
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Messaggio *</Form.Label>
              <Form.Control
                as="textarea"
                rows={5}
                value={messaggio}
                onChange={(e) => setMessaggio(e.target.value)}
                placeholder="Scrivi il messaggio..."
                required
              />
            </Form.Group>

            <Button
              type="submit"
              style={{
                background: '#25D366',
                border: 'none',
                color: 'white',
                fontWeight: '600',
                padding: '0.75rem 1.5rem'
              }}
            >
              <FaWhatsapp className="me-2" />
              Apri WhatsApp con Messaggio
            </Button>
          </Form>
        </Card.Body>
      </Card>

      {/* Istruzioni */}
      <Card className="mt-4">
        <Card.Header>
          <h5 className="card-title mb-0">
            <FaInfoCircle className="me-2" />
            Come Usare i Link WhatsApp
          </h5>
        </Card.Header>
        <Card.Body>
          <div style={{ background: '#F9F5F0', padding: '1.5rem', borderRadius: '8px' }}>
            <h6>📱 Per inviare promemoria appuntamenti:</h6>
            <ol style={{ marginBottom: '1.5rem' }}>
              <li>Vai alla pagina <strong>Appuntamenti</strong></li>
              <li>Clicca il bottone 📱 accanto all'appuntamento</li>
              <li>Si apre WhatsApp con il messaggio già pronto</li>
              <li>Clicca <strong>Invia</strong></li>
            </ol>

            <h6>💬 Per messaggi personalizzati:</h6>
            <ol style={{ marginBottom: '1.5rem' }}>
              <li>Usa il form qui sopra</li>
              <li>Inserisci numero e messaggio</li>
              <li>Clicca "Apri WhatsApp con Messaggio"</li>
              <li>Clicca <strong>Invia</strong> in WhatsApp</li>
            </ol>

            <h6>✅ Gestione risposte:</h6>
            <ul className="mb-0">
              <li>Quando il cliente risponde <strong>SI</strong> → Aggiorna lo stato a "Confermato"</li>
              <li>Quando il cliente risponde <strong>NO</strong> → Aggiorna lo stato a "Annullato"</li>
              <li>Aggiorna manualmente lo stato nell'appuntamento</li>
            </ul>
          </div>

          <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#FFF3CD', borderRadius: '8px', border: '1px solid #FFEAA7' }}>
            <strong>💡 Suggerimento:</strong>
            <p className="mb-0" style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
              Per un'automazione completa al 100%, considera in futuro <strong>Twilio WhatsApp API</strong> (costo: ~0.005€ per messaggio). 
              È l'unica soluzione ufficiale che invia messaggi automaticamente senza intervento manuale.
            </p>
          </div>
        </Card.Body>
      </Card>
    </div>
  )
}

export default WhatsApp
