import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { Modal, Button, Form, Alert } from 'react-bootstrap'
import { FaKey, FaUsers, FaUnlockAlt } from 'react-icons/fa'
import { API_BASE_URL } from '../config.js'

const LUNGHEZZA_MINIMA = 10

function Impostazioni({ utente, onPasswordCambiata }) {
  const [miaPassword, setMiaPassword] = useState({ passwordAttuale: '', nuovaPassword: '', conferma: '' })
  const [esitoMia, setEsitoMia] = useState(null)
  const [utenti, setUtenti] = useState([])
  const [resetUtente, setResetUtente] = useState(null)
  const [resetPassword, setResetPassword] = useState({ nuovaPassword: '', conferma: '' })
  const [esitoReset, setEsitoReset] = useState(null)
  const [master, setMaster] = useState({ passwordAttuale: '', nuovaPassword: '', conferma: '' })
  const [esitoMaster, setEsitoMaster] = useState(null)

  const isAdmin = utente?.ruolo === 'admin'

  useEffect(() => {
    if (!isAdmin) return
    axios.get(`${API_BASE_URL}/api/utenti`)
      .then(res => setUtenti(res.data))
      .catch(err => console.error('Errore caricamento account:', err))
  }, [isAdmin])

  const messaggioErrore = (err) => err.response?.data?.error || 'Errore durante il salvataggio'

  const confermaCorrisponde = (valori) => valori.nuovaPassword === valori.conferma

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setEsitoMia(null)
    if (!confermaCorrisponde(miaPassword)) {
      setEsitoMia({ tipo: 'danger', testo: 'La conferma non corrisponde alla nuova password' })
      return
    }
    try {
      await axios.post(`${API_BASE_URL}/api/password`, {
        passwordAttuale: miaPassword.passwordAttuale,
        nuovaPassword: miaPassword.nuovaPassword
      })
      setMiaPassword({ passwordAttuale: '', nuovaPassword: '', conferma: '' })
      setEsitoMia({
        tipo: 'success',
        testo: 'Password aggiornata. Le sessioni già aperte restano valide fino alla scadenza: se temi che qualcuno abbia le credenziali vecchie, esci da tutti i dispositivi.'
      })
      onPasswordCambiata?.()
    } catch (err) {
      setEsitoMia({ tipo: 'danger', testo: messaggioErrore(err) })
    }
  }

  const handleReset = async (e) => {
    e.preventDefault()
    setEsitoReset(null)
    if (!confermaCorrisponde(resetPassword)) {
      setEsitoReset({ tipo: 'danger', testo: 'La conferma non corrisponde alla nuova password' })
      return
    }
    try {
      await axios.put(`${API_BASE_URL}/api/utenti/${resetUtente.id}/password`, {
        nuovaPassword: resetPassword.nuovaPassword
      })
      setEsitoReset({ tipo: 'success', testo: `Nuova password impostata per ${resetUtente.username}` })
      setResetUtente(null)
      setResetPassword({ nuovaPassword: '', conferma: '' })
    } catch (err) {
      setEsitoReset({ tipo: 'danger', testo: messaggioErrore(err) })
    }
  }

  const handleChangeMaster = async (e) => {
    e.preventDefault()
    setEsitoMaster(null)
    if (!confermaCorrisponde(master)) {
      setEsitoMaster({ tipo: 'danger', testo: 'La conferma non corrisponde alla nuova password' })
      return
    }
    try {
      await axios.put(`${API_BASE_URL}/api/password-master`, {
        passwordAttuale: master.passwordAttuale,
        nuovaPassword: master.nuovaPassword
      })
      setMaster({ passwordAttuale: '', nuovaPassword: '', conferma: '' })
      setEsitoMaster({ tipo: 'success', testo: 'Password master aggiornata: comunicala ai dipendenti che applicano gli sconti' })
    } catch (err) {
      setEsitoMaster({ tipo: 'danger', testo: messaggioErrore(err) })
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Impostazioni</h1>
        <p>Credenziali di accesso e password master</p>
      </div>

      <div className="card scheda-impostazioni">
        <div className="card-header">
          <h5 className="card-title"><FaKey className="me-2" />La mia password</h5>
          <span className="testo-secondario">accesso come <strong>{utente?.username}</strong></span>
        </div>
        {esitoMia && <Alert variant={esitoMia.tipo}>{esitoMia.testo}</Alert>}
        <Form onSubmit={handleChangePassword}>
          <Form.Group className="mb-3">
            <Form.Label>Password attuale *</Form.Label>
            <Form.Control
              type="password"
              value={miaPassword.passwordAttuale}
              onChange={(e) => setMiaPassword({ ...miaPassword, passwordAttuale: e.target.value })}
              autoComplete="current-password"
              required
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Nuova password *</Form.Label>
            <Form.Control
              type="password"
              value={miaPassword.nuovaPassword}
              onChange={(e) => setMiaPassword({ ...miaPassword, nuovaPassword: e.target.value })}
              autoComplete="new-password"
              minLength={LUNGHEZZA_MINIMA}
              required
            />
            <Form.Text className="text-muted">Almeno {LUNGHEZZA_MINIMA} caratteri</Form.Text>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Conferma nuova password *</Form.Label>
            <Form.Control
              type="password"
              value={miaPassword.conferma}
              onChange={(e) => setMiaPassword({ ...miaPassword, conferma: e.target.value })}
              autoComplete="new-password"
              minLength={LUNGHEZZA_MINIMA}
              required
            />
          </Form.Group>
          <Button variant="primary" type="submit">
            Cambia la mia password
          </Button>
        </Form>
      </div>

      {isAdmin && (
        <div className="card scheda-impostazioni">
          <div className="card-header">
            <h5 className="card-title"><FaUsers className="me-2" />Account</h5>
          </div>
          {esitoReset && <Alert variant={esitoReset.tipo}>{esitoReset.testo}</Alert>}
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Nome</th>
                  <th>Ruolo</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {utenti.map(account => (
                  <tr key={account.id}>
                    <td>
                      <strong>{account.username}</strong>
                      {account.id === utente?.id && <span className="testo-secondario"> (tu)</span>}
                    </td>
                    <td>{account.nome}</td>
                    <td><span className="badge badge-info ruolo-account">{account.ruolo}</span></td>
                    <td>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => { setResetUtente(account); setResetPassword({ nuovaPassword: '', conferma: '' }) }}
                      >
                        <FaUnlockAlt className="me-1" /> Reimposta password
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="testo-secondario mb-0">
            Il reset non revoca le sessioni già aperte di quell'account: restano valide fino alla scadenza.
          </p>
        </div>
      )}

      {isAdmin && (
        <div className="card scheda-impostazioni">
          <div className="card-header">
            <h5 className="card-title"><FaUnlockAlt className="me-2" />Password master per gli sconti</h5>
          </div>
          {esitoMaster && <Alert variant={esitoMaster.tipo}>{esitoMaster.testo}</Alert>}
          <Form onSubmit={handleChangeMaster}>
            <Form.Group className="mb-3">
              <Form.Label>Password master attuale *</Form.Label>
              <Form.Control
                type="password"
                value={master.passwordAttuale}
                onChange={(e) => setMaster({ ...master, passwordAttuale: e.target.value })}
                autoComplete="current-password"
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Nuova password master *</Form.Label>
              <Form.Control
                type="password"
                value={master.nuovaPassword}
                onChange={(e) => setMaster({ ...master, nuovaPassword: e.target.value })}
                autoComplete="new-password"
                minLength={LUNGHEZZA_MINIMA}
                required
              />
              <Form.Text className="text-muted">
                Viene richiesta ai dipendenti per applicare uno sconto dalla pagina Servizi
              </Form.Text>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Conferma nuova password master *</Form.Label>
              <Form.Control
                type="password"
                value={master.conferma}
                onChange={(e) => setMaster({ ...master, conferma: e.target.value })}
                autoComplete="new-password"
                minLength={LUNGHEZZA_MINIMA}
                required
              />
            </Form.Group>
            <Button variant="primary" type="submit">
              Cambia la password master
            </Button>
          </Form>
        </div>
      )}

      <Modal show={!!resetUtente} onHide={() => setResetUtente(null)}>
        <Modal.Header closeButton>
          <Modal.Title>Reimposta password di {resetUtente?.username}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleReset}>
          <Modal.Body>
            {esitoReset?.tipo === 'danger' && <Alert variant="danger">{esitoReset.testo}</Alert>}
            <Form.Group className="mb-3">
              <Form.Label>Nuova password *</Form.Label>
              <Form.Control
                type="password"
                value={resetPassword.nuovaPassword}
                onChange={(e) => setResetPassword({ ...resetPassword, nuovaPassword: e.target.value })}
                autoComplete="new-password"
                minLength={LUNGHEZZA_MINIMA}
                required
              />
              <Form.Text className="text-muted">
                Almeno {LUNGHEZZA_MINIMA} caratteri. Comunicala all'interessato: dovrà cambiarla al primo accesso.
              </Form.Text>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Conferma nuova password *</Form.Label>
              <Form.Control
                type="password"
                value={resetPassword.conferma}
                onChange={(e) => setResetPassword({ ...resetPassword, conferma: e.target.value })}
                autoComplete="new-password"
                minLength={LUNGHEZZA_MINIMA}
                required
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setResetUtente(null)}>Annulla</Button>
            <Button variant="primary" type="submit">Imposta password</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  )
}

export default Impostazioni
