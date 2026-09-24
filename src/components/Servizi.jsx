import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { Modal, Button, Form, Alert } from 'react-bootstrap'
import { FaPlus, FaEdit, FaTrash, FaConciergeBell } from 'react-icons/fa'

function Servizi({ utente }) {
  const [servizi, setServizi] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [showMasterModal, setShowMasterModal] = useState(false)
  const [editingServizio, setEditingServizio] = useState(null)
  const [masterPassword, setMasterPassword] = useState('')
  const [masterError, setMasterError] = useState('')
  const [scontoApplicato, setScontoApplicato] = useState(null)
  const [formData, setFormData] = useState({
    nome: '',
    durata: 60,
    prezzo: 0,
    categoria: '',
    descrizione: ''
  })

  useEffect(() => {
    loadServizi()
  }, [])

  const loadServizi = async () => {
    try {
      const res = await axios.get('http://localhost:3001/api/servizi')
      setServizi(res.data)
    } catch (err) {
      console.error('Errore caricamento servizi:', err)
    }
  }

  const handleOpenModal = (servizio = null) => {
    if (servizio) {
      setEditingServizio(servizio)
      setFormData(servizio)
    } else {
      setEditingServizio(null)
      setFormData({
        nome: '',
        durata: 60,
        prezzo: 0,
        categoria: '',
        descrizione: ''
      })
    }
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingServizio(null)
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingServizio) {
        await axios.put(`http://localhost:3001/api/servizi/${editingServizio.id}`, formData)
      } else {
        await axios.post('http://localhost:3001/api/servizi', formData)
      }
      handleCloseModal()
      loadServizi()
    } catch (err) {
      console.error('Errore salvataggio servizio:', err)
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('Sei sicuro di voler eliminare questo servizio?')) {
      try {
        await axios.delete(`http://localhost:3001/api/servizi/${id}`)
        loadServizi()
      } catch (err) {
        console.error('Errore eliminazione servizio:', err)
      }
    }
  }

  const handleApplyDiscount = (servizio) => {
    if (utente.ruolo === 'admin') {
      const sconto = prompt(`Inserisci lo sconto percentuale per "${servizio.nome}" (0-100):`)
      if (sconto !== null && sconto !== '') {
        const scontoNum = parseFloat(sconto)
        if (scontoNum >= 0 && scontoNum <= 100) {
          setScontoApplicato({ servizioId: servizio.id, sconto: scontoNum })
          alert(`Sconto del ${scontoNum}% applicato a ${servizio.nome}`)
        }
      }
    } else {
      setEditingServizio(servizio)
      setShowMasterModal(true)
    }
  }

  const handleMasterSubmit = async (e) => {
    e.preventDefault()
    setMasterError('')
    try {
      const res = await axios.post('http://localhost:3001/api/verifica-master', {
        password: masterPassword
      })
      if (res.data.valido) {
        setShowMasterModal(false)
        setMasterPassword('')
        const sconto = prompt(`Inserisci lo sconto percentuale per "${editingServizio.nome}" (0-100):`)
        if (sconto !== null && sconto !== '') {
          const scontoNum = parseFloat(sconto)
          if (scontoNum >= 0 && scontoNum <= 100) {
            setScontoApplicato({ servizioId: editingServizio.id, sconto: scontoNum })
            alert(`Sconto del ${scontoNum}% applicato a ${editingServizio.nome}`)
          }
        }
      }
    } catch (err) {
      setMasterError('Password master non corretta')
    }
  }

  const getPrezzoScontato = (servizio) => {
    if (scontoApplicato && scontoApplicato.servizioId === servizio.id) {
      const prezzoOriginale = servizio.prezzo
      const sconto = scontoApplicato.sconto
      return (prezzoOriginale * (1 - sconto / 100)).toFixed(2)
    }
    return null
  }

  return (
    <div>
      <div className="page-header">
        <h1>Servizi</h1>
        <p>Gestisci il catalogo dei servizi offerti</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h5 className="card-title">Lista Servizi</h5>
          <Button variant="primary" onClick={() => handleOpenModal()}>
            <FaPlus /> Nuovo Servizio
          </Button>
        </div>

        {servizi.length === 0 ? (
          <div className="empty-state">
            <FaConciergeBell />
            <h3>Nessun servizio disponibile</h3>
            <p>Inizia aggiungendo i servizi del tuo centro estetico</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Servizio</th>
                  <th>Categoria</th>
                  <th>Durata</th>
                  <th>Prezzo</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {servizi.map(servizio => (
                  <tr key={servizio.id}>
                    <td>
                      <strong>{servizio.nome}</strong>
                      {servizio.descrizione && (
                        <div style={{ fontSize: '0.85rem', color: '#6B7280' }}>
                          {servizio.descrizione}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className="badge badge-info">{servizio.categoria || 'Generale'}</span>
                    </td>
                    <td>{servizio.durata} min</td>
                    <td>
                      {getPrezzoScontato(servizio) ? (
                        <>
                          <span style={{ textDecoration: 'line-through', color: '#9CA3AF', marginRight: '0.5rem' }}>
                            €{servizio.prezzo}
                          </span>
                          <strong style={{ color: '#10B981' }}>€{getPrezzoScontato(servizio)}</strong>
                          <span className="badge badge-success ms-2" style={{ fontSize: '0.7rem' }}>
                            -{scontoApplicato.sconto}%
                          </span>
                        </>
                      ) : (
                        <strong>€{servizio.prezzo}</strong>
                      )}
                    </td>
                    <td>
                      <Button
                        variant="outline-success"
                        size="sm"
                        className="me-2"
                        onClick={() => handleApplyDiscount(servizio)}
                        title="Applica sconto"
                      >
                        💰
                      </Button>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        className="me-2"
                        onClick={() => handleOpenModal(servizio)}
                      >
                        <FaEdit />
                      </Button>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => handleDelete(servizio.id)}
                      >
                        <FaTrash />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal show={showModal} onHide={handleCloseModal}>
        <Modal.Header closeButton>
          <Modal.Title>{editingServizio ? 'Modifica Servizio' : 'Nuovo Servizio'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Nome Servizio *</Form.Label>
              <Form.Control
                type="text"
                name="nome"
                value={formData.nome}
                onChange={handleChange}
                required
                placeholder="es. Massaggio Rilassante"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Categoria</Form.Label>
              <Form.Select
                name="categoria"
                value={formData.categoria}
                onChange={handleChange}
              >
                <option value="">Seleziona categoria...</option>
                <option value="Massaggi">Massaggi</option>
                <option value="Viso">Trattamenti Viso</option>
                <option value="Corpo">Trattamenti Corpo</option>
                <option value="Manicure">Manicure & Pedicure</option>
                <option value="Depilazione">Depilazione</option>
                <option value="Makeup">Trucco</option>
                <option value="Altro">Altro</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Durata (minuti) *</Form.Label>
              <Form.Control
                type="number"
                name="durata"
                value={formData.durata}
                onChange={handleChange}
                required
                min="15"
                step="15"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Prezzo (€) *</Form.Label>
              <Form.Control
                type="number"
                name="prezzo"
                value={formData.prezzo}
                onChange={handleChange}
                required
                min="0"
                step="1"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Descrizione</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="descrizione"
                value={formData.descrizione}
                onChange={handleChange}
                placeholder="Descrizione del servizio..."
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal}>
              Annulla
            </Button>
            <Button variant="primary" type="submit">
              {editingServizio ? 'Aggiorna' : 'Crea'} Servizio
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal show={showMasterModal} onHide={() => { setShowMasterModal(false); setMasterError(''); setMasterPassword(''); }}>
        <Modal.Header closeButton>
          <Modal.Title>🔐 Autorizzazione Richiesta</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleMasterSubmit}>
          <Modal.Body>
            <p style={{ marginBottom: '1rem', color: '#6B7280' }}>
              Inserisci la password master per applicare lo sconto al servizio <strong>{editingServizio?.nome}</strong>
            </p>
            {masterError && (
              <Alert variant="danger" style={{ borderRadius: '8px' }}>
                {masterError}
              </Alert>
            )}
            <Form.Group>
              <Form.Label>Password Master</Form.Label>
              <Form.Control
                type="password"
                value={masterPassword}
                onChange={(e) => setMasterPassword(e.target.value)}
                placeholder="Inserisci password master"
                required
                autoFocus
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => { setShowMasterModal(false); setMasterError(''); setMasterPassword(''); }}>
              Annulla
            </Button>
            <Button variant="primary" type="submit">
              Verifica
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  )
}

export default Servizi
