import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { Modal, Button, Form } from 'react-bootstrap'
import { FaPlus, FaEdit, FaTrash, FaUserNurse } from 'react-icons/fa'
import { API_BASE_URL } from '../config.js'

function Operatori() {
  const [operatori, setOperatori] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editingOperatore, setEditingOperatore] = useState(null)
  const [formData, setFormData] = useState({ nome: '', specialita: '' })

  useEffect(() => {
    loadOperatori()
  }, [])

  const loadOperatori = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/operatori`)
      setOperatori(res.data)
    } catch (err) {
      console.error('Errore caricamento operatori:', err)
    }
  }

  const handleOpenModal = (operatore = null) => {
    if (operatore) {
      setEditingOperatore(operatore)
      setFormData({ nome: operatore.nome, specialita: operatore.specialita || '' })
    } else {
      setEditingOperatore(null)
      setFormData({ nome: '', specialita: '' })
    }
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingOperatore(null)
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingOperatore) {
        await axios.put(`${API_BASE_URL}/api/operatori/${editingOperatore.id}`, formData)
      } else {
        await axios.post(`${API_BASE_URL}/api/operatori`, formData)
      }
      handleCloseModal()
      loadOperatori()
    } catch (err) {
      console.error('Errore salvataggio operatore:', err)
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('Eliminare questo operatore? Gli appuntamenti già registrati mantengono il suo nome.')) {
      try {
        await axios.delete(`${API_BASE_URL}/api/operatori/${id}`)
        loadOperatori()
      } catch (err) {
        console.error('Errore eliminazione operatore:', err)
      }
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Operatori</h1>
        <p>Gestisci gli operatori che eseguono i servizi del centro</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h5 className="card-title">Lista Operatori</h5>
          <Button variant="primary" onClick={() => handleOpenModal()}>
            <FaPlus /> Nuovo Operatore
          </Button>
        </div>

        {operatori.length === 0 ? (
          <div className="empty-state">
            <FaUserNurse />
            <h3>Nessun operatore disponibile</h3>
            <p>Aggiungi gli operatori del tuo centro: compariranno nella creazione degli appuntamenti</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Operatore</th>
                  <th>Specialità</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {operatori.map(operatore => (
                  <tr key={operatore.id}>
                    <td><strong>{operatore.nome}</strong></td>
                    <td>
                      <span className="badge badge-info">{operatore.specialita || 'Generale'}</span>
                    </td>
                    <td>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        className="me-2"
                        onClick={() => handleOpenModal(operatore)}
                      >
                        <FaEdit />
                      </Button>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => handleDelete(operatore.id)}
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
          <Modal.Title>{editingOperatore ? 'Modifica Operatore' : 'Nuovo Operatore'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Nome e Cognome *</Form.Label>
              <Form.Control
                type="text"
                name="nome"
                value={formData.nome}
                onChange={handleChange}
                required
                placeholder="es. Giulia Neri"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Specialità</Form.Label>
              <Form.Control
                type="text"
                name="specialita"
                value={formData.specialita}
                onChange={handleChange}
                placeholder="es. Massaggi, Estetica, Manicure"
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal}>
              Annulla
            </Button>
            <Button variant="primary" type="submit">
              {editingOperatore ? 'Aggiorna' : 'Crea'} Operatore
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  )
}

export default Operatori
