import React, { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import { Modal, Button, Form } from 'react-bootstrap'
import { FaPlus, FaEdit, FaTrash, FaUser, FaSearch, FaTimes } from 'react-icons/fa'
import { API_BASE_URL } from '../config.js'
import { corrisponde, nomeCompleto } from '../utils/ricerca.js'

function Clienti() {
  const [clienti, setClienti] = useState([])
  const [ricerca, setRicerca] = useState('')
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
      const res = await axios.get(`${API_BASE_URL}/api/clienti`)
      setClienti(res.data)
    } catch (err) {
      console.error('Errore caricamento clienti:', err)
    }
  }

  const clientiFiltrati = useMemo(
    () => clienti.filter(cliente =>
      corrisponde([nomeCompleto(cliente), cliente.telefono, cliente.email], ricerca)
    ),
    [clienti, ricerca]
  )

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
        await axios.put(`${API_BASE_URL}/api/clienti/${editingCliente.id}`, formData)
      } else {
        await axios.post(`${API_BASE_URL}/api/clienti`, formData)
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
        await axios.delete(`${API_BASE_URL}/api/clienti/${id}`)
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
          <div className="azioni-lista">
            <div className="ricerca-cliente-input filtro-lista">
              <FaSearch className="ricerca-cliente-icon" />
              <Form.Control
                type="text"
                value={ricerca}
                onChange={(e) => setRicerca(e.target.value)}
                placeholder="Cerca per nome, cognome, telefono o email..."
                aria-label="Cerca cliente"
              />
              {ricerca && (
                <button
                  type="button"
                  className="ricerca-cliente-clear"
                  onClick={() => setRicerca('')}
                  aria-label="Azzera la ricerca"
                >
                  <FaTimes />
                </button>
              )}
            </div>
            <Button variant="primary" onClick={() => handleOpenModal()}>
              <FaPlus /> Nuovo Cliente
            </Button>
          </div>
        </div>

        {ricerca && clienti.length > 0 && (
          <p className="esito-ricerca">
            {clientiFiltrati.length === 1 ? '1 cliente trovato' : `${clientiFiltrati.length} clienti trovati`} su {clienti.length}
          </p>
        )}

        {clienti.length === 0 ? (
          <div className="empty-state">
            <FaUser />
            <h3>Nessun cliente registrato</h3>
            <p>Inizia aggiungendo il tuo primo cliente</p>
          </div>
        ) : clientiFiltrati.length === 0 ? (
          <div className="empty-state">
            <FaSearch />
            <h3>Nessun cliente trovato</h3>
            <p>Nessuna anagrafica corrisponde a "{ricerca}"</p>
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
                {clientiFiltrati.map(cliente => (
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
