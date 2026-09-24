import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { Modal, Button, Form } from 'react-bootstrap'
import { FaPlus, FaEdit, FaTrash, FaCalendarAlt } from 'react-icons/fa'

function Appuntamenti({ utente }) {
  const [appuntamenti, setAppuntamenti] = useState([])
  const [clienti, setClienti] = useState([])
  const [servizi, setServizi] = useState([])
  const [operatori, setOperatori] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editingApp, setEditingApp] = useState(null)
  const [filterData, setFilterData] = useState(new Date().toISOString().split('T')[0])
  const [formData, setFormData] = useState({
    clienteId: '',
    clienteNome: '',
    servizioId: '',
    servizioNome: '',
    operatoreId: '',
    operatoreNome: '',
    data: new Date().toISOString().split('T')[0],
    ora: '09:00',
    durata: 60,
    note: '',
    stato: 'confermato'
  })

  useEffect(() => {
    loadAppuntamenti()
    loadClienti()
    loadServizi()
    loadOperatori()
  }, [filterData])

  const loadAppuntamenti = async () => {
    try {
      const res = await axios.get(`http://localhost:3001/api/appuntamenti?data=${filterData}`)
      setAppuntamenti(res.data)
    } catch (err) {
      console.error('Errore caricamento appuntamenti:', err)
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

  const handleOpenModal = (app = null) => {
    if (app) {
      setEditingApp(app)
      setFormData(app)
    } else {
      setEditingApp(null)
      setFormData({
        clienteId: '',
        clienteNome: '',
        servizioId: '',
        servizioNome: '',
        operatoreId: '',
        operatoreNome: '',
        data: filterData,
        ora: '09:00',
        durata: 60,
        note: '',
        stato: 'confermato'
      })
    }
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingApp(null)
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
          clienteNome: `${cliente.nome} ${cliente.cognome}`,
          clienteTelefono: cliente.telefono || ''
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
          durata: servizio.durata
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
      if (editingApp) {
        await axios.put(`http://localhost:3001/api/appuntamenti/${editingApp.id}`, formData)
      } else {
        await axios.post('http://localhost:3001/api/appuntamenti', formData)
      }
      handleCloseModal()
      loadAppuntamenti()
    } catch (err) {
      if (err.response?.status === 409) {
        alert(`⚠️ Conflitto Orario!\n\n${err.response.data.messaggio}\n\nScegli un altro orario o un altro operatore.`)
      } else {
        console.error('Errore salvataggio appuntamento:', err)
        alert('Errore durante il salvataggio dell\'appuntamento')
      }
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('Sei sicuro di voler eliminare questo appuntamento?')) {
      try {
        await axios.delete(`http://localhost:3001/api/appuntamenti/${id}`)
        loadAppuntamenti()
      } catch (err) {
        console.error('Errore eliminazione appuntamento:', err)
      }
    }
  }

  const handleInviaPromemoria = async (id) => {
    try {
      const res = await axios.get(`http://localhost:3001/api/whatsapp/promemoria/${id}`)
      
      // Apri WhatsApp con il link generato
      window.open(res.data.link, '_blank')
      
      // Aggiorna stato promemoria inviato
      await axios.put(`http://localhost:3001/api/appuntamenti/${id}`, {
        promemoriaInviato: true,
        dataPromemoria: new Date().toISOString()
      })
      
      loadAppuntamenti()
    } catch (err) {
      alert('❌ Errore: ' + (err.response?.data?.error || 'Impossibile generare il link WhatsApp'))
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Appuntamenti</h1>
        <p>Gestisci il calendario degli appuntamenti</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h5 className="card-title">Calendario Appuntamenti</h5>
          <div>
            <Form.Control
              type="date"
              value={filterData}
              onChange={(e) => setFilterData(e.target.value)}
              className="d-inline-block me-2"
              style={{ width: 'auto' }}
            />
            <Button variant="primary" onClick={() => handleOpenModal()}>
              <FaPlus /> Nuovo
            </Button>
          </div>
        </div>

        {appuntamenti.length === 0 ? (
          <div className="empty-state">
            <FaCalendarAlt />
            <h3>Nessun appuntamento</h3>
            <p>Non ci sono appuntamenti per questa data</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Ora</th>
                  <th>Cliente</th>
                  <th>Servizio</th>
                  <th>Operatore</th>
                  <th>Durata</th>
                  <th>Stato</th>
                  <th>WhatsApp</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {appuntamenti.sort((a, b) => a.ora.localeCompare(b.ora)).map(app => (
                  <tr key={app.id}>
                    <td><strong>{app.ora}</strong></td>
                    <td>{app.clienteNome}</td>
                    <td>{app.servizioNome}</td>
                    <td>{app.operatoreNome}</td>
                    <td>{app.durata} min</td>
                    <td>
                      <span className={`badge badge-${app.stato === 'confermato' ? 'success' : app.stato === 'pending' ? 'warning' : app.stato === 'annullato' ? 'danger' : 'info'}`}>
                        {app.stato}
                      </span>
                    </td>
                    <td>
                      {app.whatsappConferma === 'confermato' && (
                        <span className="badge badge-success">✅ Confermato</span>
                      )}
                      {app.whatsappConferma === 'annullato' && (
                        <span className="badge badge-danger">❌ Annullato</span>
                      )}
                      {!app.whatsappConferma && app.promemoriaInviato && (
                        <span className="badge badge-warning">⏳ In attesa</span>
                      )}
                      {!app.promemoriaInviato && (
                        <Button
                          variant="outline-success"
                          size="sm"
                          onClick={() => handleInviaPromemoria(app.id)}
                          title="Invia promemoria WhatsApp"
                        >
                          📱
                        </Button>
                      )}
                    </td>
                    <td>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        className="me-2"
                        onClick={() => handleOpenModal(app)}
                      >
                        <FaEdit />
                      </Button>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => handleDelete(app.id)}
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
          <Modal.Title>{editingApp ? 'Modifica Appuntamento' : 'Nuovo Appuntamento'}</Modal.Title>
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
                  <option key={s.id} value={s.id}>{s.nome} ({s.durata} min - €{s.prezzo})</option>
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
                  <option key={o.id} value={o.id}>{o.nome} - {o.specialita}</option>
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
              <Form.Label>Ora *</Form.Label>
              <Form.Control
                type="time"
                name="ora"
                value={formData.ora}
                onChange={handleChange}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Stato</Form.Label>
              <Form.Select
                name="stato"
                value={formData.stato}
                onChange={handleChange}
              >
                <option value="confermato">Confermato</option>
                <option value="pending">In attesa</option>
                <option value="annullato">Annullato</option>
                <option value="completato">Completato</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Note</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                name="note"
                value={formData.note}
                onChange={handleChange}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal}>
              Annulla
            </Button>
            <Button variant="primary" type="submit">
              {editingApp ? 'Aggiorna' : 'Crea'} Appuntamento
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  )
}

export default Appuntamenti
