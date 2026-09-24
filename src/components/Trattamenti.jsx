import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { Modal, Button, Form } from 'react-bootstrap'
import { FaPlus, FaTrash, FaClipboardList } from 'react-icons/fa'

function Trattamenti() {
  const [trattamenti, setTrattamenti] = useState([])
  const [clienti, setClienti] = useState([])
  const [servizi, setServizi] = useState([])
  const [operatori, setOperatori] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [filterCliente, setFilterCliente] = useState('')
  const [formData, setFormData] = useState({
    clienteId: '',
    clienteNome: '',
    servizioId: '',
    servizioNome: '',
    operatoreId: '',
    operatoreNome: '',
    data: new Date().toISOString().split('T')[0],
    note: '',
    prezzo: 0
  })

  useEffect(() => {
    loadTrattamenti()
    loadClienti()
    loadServizi()
    loadOperatori()
  }, [filterCliente])

  const loadTrattamenti = async () => {
    try {
      const url = filterCliente
        ? `http://localhost:3001/api/trattamenti?clienteId=${filterCliente}`
        : 'http://localhost:3001/api/trattamenti'
      const res = await axios.get(url)
      setTrattamenti(res.data)
    } catch (err) {
      console.error('Errore caricamento trattamenti:', err)
    }
  }

  const loadClienti = async () => {
    try {
      const res = await axios.get('http://localhost:3001/api/clienti')
      setClienti(res.data)
    } catch (err) {
      console.error('Errore caricamento clienti:', err)
    }
  }

  const loadServizi = async () => {
    try {
      const res = await axios.get('http://localhost:3001/api/servizi')
      setServizi(res.data)
    } catch (err) {
      console.error('Errore caricamento servizi:', err)
    }
  }

  const loadOperatori = async () => {
    try {
      const res = await axios.get('http://localhost:3001/api/operatori')
      setOperatori(res.data)
    } catch (err) {
      console.error('Errore caricamento operatori:', err)
    }
  }

  const handleOpenModal = () => {
    setFormData({
      clienteId: '',
      clienteNome: '',
      servizioId: '',
      servizioNome: '',
      operatoreId: '',
      operatoreNome: '',
      data: new Date().toISOString().split('T')[0],
      note: '',
      prezzo: 0
    })
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })

    if (name === 'clienteId') {
      const cliente = clienti.find(c => c.id === value)
      if (cliente) {
        setFormData(prev => ({
          ...prev,
          clienteId: value,
          clienteNome: `${cliente.nome} ${cliente.cognome}`
        }))
      }
    }
    if (name === 'servizioId') {
      const servizio = servizi.find(s => s.id === value)
      if (servizio) {
        setFormData(prev => ({
          ...prev,
          servizioId: value,
          servizioNome: servizio.nome,
          prezzo: servizio.prezzo
        }))
      }
    }
    if (name === 'operatoreId') {
      const operatore = operatori.find(o => o.id === value)
      if (operatore) {
        setFormData(prev => ({
          ...prev,
          operatoreId: value,
          operatoreNome: operatore.nome
        }))
      }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await axios.post('http://localhost:3001/api/trattamenti', formData)
      handleCloseModal()
      loadTrattamenti()
    } catch (err) {
      console.error('Errore salvataggio trattamento:', err)
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('Sei sicuro di voler eliminare questo trattamento?')) {
      try {
        await axios.delete(`http://localhost:3001/api/trattamenti/${id}`)
        loadTrattamenti()
      } catch (err) {
        console.error('Errore eliminazione trattamento:', err)
      }
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Storico Trattamenti</h1>
        <p>Registro di tutti i trattamenti effettuati</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h5 className="card-title">Lista Trattamenti</h5>
          <div>
            <Form.Select
              value={filterCliente}
              onChange={(e) => setFilterCliente(e.target.value)}
              className="d-inline-block me-2"
              style={{ width: 'auto' }}
            >
              <option value="">Tutti i clienti</option>
              {clienti.map(c => (
                <option key={c.id} value={c.id}>{c.nome} {c.cognome}</option>
              ))}
            </Form.Select>
            <Button variant="primary" onClick={handleOpenModal}>
              <FaPlus /> Nuovo
            </Button>
          </div>
        </div>

        {trattamenti.length === 0 ? (
          <div className="empty-state">
            <FaClipboardList />
            <h3>Nessun trattamento registrato</h3>
            <p>Inizia registrando i trattamenti effettuati</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Cliente</th>
                  <th>Servizio</th>
                  <th>Operatore</th>
                  <th>Prezzo</th>
                  <th>Note</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {trattamenti.sort((a, b) => new Date(b.data) - new Date(a.data)).map(tratt => (
                  <tr key={tratt.id}>
                    <td>{new Date(tratt.data).toLocaleDateString('it-IT')}</td>
                    <td><strong>{tratt.clienteNome}</strong></td>
                    <td>{tratt.servizioNome}</td>
                    <td>{tratt.operatoreNome}</td>
                    <td><strong>€{tratt.prezzo}</strong></td>
                    <td>{tratt.note || '-'}</td>
                    <td>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => handleDelete(tratt.id)}
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
          <Modal.Title>Registra Trattamento</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Cliente *</Form.Label>
              <Form.Select
                name="clienteId"
                value={formData.clienteId}
                onChange={handleChange}
                required
              >
                <option value="">Seleziona cliente...</option>
                {clienti.map(c => (
                  <option key={c.id} value={c.id}>{c.nome} {c.cognome}</option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Servizio *</Form.Label>
              <Form.Select
                name="servizioId"
                value={formData.servizioId}
                onChange={handleChange}
                required
              >
                <option value="">Seleziona servizio...</option>
                {servizi.map(s => (
                  <option key={s.id} value={s.id}>{s.nome} - €{s.prezzo}</option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Operatore *</Form.Label>
              <Form.Select
                name="operatoreId"
                value={formData.operatoreId}
                onChange={handleChange}
                required
              >
                <option value="">Seleziona operatore...</option>
                {operatori.map(o => (
                  <option key={o.id} value={o.id}>{o.nome}</option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Data *</Form.Label>
              <Form.Control
                type="date"
                name="data"
                value={formData.data}
                onChange={handleChange}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Prezzo (€)</Form.Label>
              <Form.Control
                type="number"
                name="prezzo"
                value={formData.prezzo}
                onChange={handleChange}
                min="0"
                step="1"
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
                placeholder="Note sul trattamento effettuato..."
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal}>
              Annulla
            </Button>
            <Button variant="primary" type="submit">
              Registra Trattamento
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  )
}

export default Trattamenti
