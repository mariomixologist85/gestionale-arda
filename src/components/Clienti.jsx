import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { Modal, Button, Form } from 'react-bootstrap'
import { FaPlus, FaEdit, FaTrash, FaUser } from 'react-icons/fa'

function Clienti() {
  const [clienti, setClienti] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editingCliente, setEditingCliente] = useState(null)
  const [formData, setFormData] = useState({
    nome: '',
    cognome: '',
    telefono: '',
    email: '',
    dataNascita: '',
    note: '',
    allergie: ''
  })

  useEffect(() => {
    loadClienti()
  }, [])

  const loadClienti = async () => {
    try {
      const res = await axios.get('http://localhost:3001/api/clienti')
      setClienti(res.data)
    } catch (err) {
      console.error('Errore caricamento clienti:', err)
    }
  }

  const handleOpenModal = (cliente = null) => {
    if (cliente) {
      setEditingCliente(cliente)
      setFormData(cliente)
    } else {
      setEditingCliente(null)
      setFormData({
        nome: '',
        cognome: '',
        telefono: '',
        email: '',
        dataNascita: '',
        note: '',
        allergie: ''
      })
    }
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingCliente(null)
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingCliente) {
        await axios.put(`http://localhost:3001/api/clienti/${editingCliente.id}`, formData)
      } else {
        await axios.post('http://localhost:3001/api/clienti', formData)
      }
      handleCloseModal()
      loadClienti()
    } catch (err) {
      console.error('Errore salvataggio cliente:', err)
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('Sei sicuro di voler eliminare questo cliente?')) {
      try {
        await axios.delete(`http://localhost:3001/api/clienti/${id}`)
        loadClienti()
      } catch (err) {
        console.error('Errore eliminazione cliente:', err)
      }
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Anagrafica Clienti</h1>
        <p>Gestisci le schede dei tuoi clienti</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h5 className="card-title">Lista Clienti</h5>
          <Button variant="primary" onClick={() => handleOpenModal()}>
            <FaPlus /> Nuovo Cliente
          </Button>
        </div>

        {clienti.length === 0 ? (
          <div className="empty-state">
            <FaUser />
            <h3>Nessun cliente registrato</h3>
            <p>Inizia aggiungendo il tuo primo cliente</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Cognome</th>
                  <th>Telefono</th>
                  <th>Email</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {clienti.map(cliente => (
                  <tr key={cliente.id}>
                    <td><strong>{cliente.nome}</strong></td>
                    <td>{cliente.cognome}</td>
                    <td>{cliente.telefono || '-'}</td>
                    <td>{cliente.email || '-'}</td>
                    <td>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        className="me-2"
                        onClick={() => handleOpenModal(cliente)}
                      >
                        <FaEdit />
                      </Button>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => handleDelete(cliente.id)}
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
          <Modal.Title>{editingCliente ? 'Modifica Cliente' : 'Nuovo Cliente'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Nome *</Form.Label>
              <Form.Control
                type="text"
                name="nome"
                value={formData.nome}
                onChange={handleChange}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Cognome *</Form.Label>
              <Form.Control
                type="text"
                name="cognome"
                value={formData.cognome}
                onChange={handleChange}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Telefono</Form.Label>
              <Form.Control
                type="tel"
                name="telefono"
                value={formData.telefono}
                onChange={handleChange}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Data di Nascita</Form.Label>
              <Form.Control
                type="date"
                name="dataNascita"
                value={formData.dataNascita}
                onChange={handleChange}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Allergie</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                name="allergie"
                value={formData.allergie}
                onChange={handleChange}
                placeholder="Eventuali allergie o sensibilità..."
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Note</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="note"
                value={formData.note}
                onChange={handleChange}
                placeholder="Note aggiuntive..."
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal}>
              Annulla
            </Button>
            <Button variant="primary" type="submit">
              {editingCliente ? 'Aggiorna' : 'Crea'} Cliente
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  )
}

export default Clienti
