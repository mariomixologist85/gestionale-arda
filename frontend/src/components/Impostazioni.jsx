import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { Modal, Button, Form, Alert } from 'react-bootstrap'
import { FaKey, FaUsers, FaUnlockAlt, FaPlus, FaEdit, FaEnvelope } from 'react-icons/fa'
import { API_BASE_URL } from '../config.js'

const LUNGHEZZA_MINIMA = 10
const RUOLI = ['admin', 'dipendente']
const CAMPI_VUOTI_UTENTE = { username: '', nome: '', ruolo: 'dipendente', email: '' }

function Impostazioni({ utente, onUtenteAggiornato }) {
  const [miaEmail, setMiaEmail] = useState(utente?.email || '')
  const [esitoEmail, setEsitoEmail] = useState(null)
  const [miaPassword, setMiaPassword] = useState({ passwordAttuale: '', nuovaPassword: '', conferma: '' })
  const [esitoPassword, setEsitoPassword] = useState(null)
  const [utenti, setUtenti] = useState([])
  const [esitoAccount, setEsitoAccount] = useState(null)
  const [accountAperto, setAccountAperto] = useState(null)
  const [esitoModale, setEsitoModale] = useState(null)
  const [resetManuale, setResetManuale] = useState(null)
  const [passwordManuale, setPasswordManuale] = useState({ nuovaPassword: '', conferma: '' })
  const [master, setMaster] = useState({ passwordAttuale: '', nuovaPassword: '', conferma: '' })
  const [esitoMaster, setEsitoMaster] = useState(null)

  const isAdmin = utente?.ruolo === 'admin'

  useEffect(() => {
    setMiaEmail(utente?.email || '')
  }, [utente?.email])

  useEffect(() => {
    if (!isAdmin) return
    axios.get(`${API_BASE_URL}/api/utenti`)
      .then(res => setUtenti(res.data))
      .catch(err => console.error('Errore caricamento account:', err))
  }, [isAdmin])

  const ricaricaUtenti = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/utenti`)
      setUtenti(res.data)
    } catch (err) {
      console.error('Errore ricaricamento account:', err)
    }
  }

  const messaggioErrore = (err) => err.response?.data?.error || 'Errore durante il salvataggio'
  const corrisponde = (valori) => valori.nuovaPassword === valori.conferma

  const handleSalvaEmail = async (e) => {
    e.preventDefault()
    setEsitoEmail(null)
    try {
      const res = await axios.put(`${API_BASE_URL}/api/profilo`, { email: miaEmail })
      onUtenteAggiornato?.({ email: res.data.email })
      setEsitoEmail({
        tipo: 'success',
        testo: res.data.email
          ? `Email salvata: il collegamento di recupero arriverà a ${res.data.email}`
          : 'Email rimossa: senza indirizzo il recupero password non è possibile'
      })
    } catch (err) {
      setEsitoEmail({ tipo: 'danger', testo: messaggioErrore(err) })
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setEsitoPassword(null)
    if (!corrisponde(miaPassword)) {
      setEsitoPassword({ tipo: 'danger', testo: 'La conferma non corrisponde alla nuova password' })
      return
    }
    try {
      await axios.post(`${API_BASE_URL}/api/password`, {
        passwordAttuale: miaPassword.passwordAttuale,
        nuovaPassword: miaPassword.nuovaPassword
      })
      setMiaPassword({ passwordAttuale: '', nuovaPassword: '', conferma: '' })
      onUtenteAggiornato?.({ passwordDaCambiare: false })
      setEsitoPassword({
        tipo: 'success',
        testo: 'Password aggiornata. Le sessioni già aperte restano valide fino alla scadenza.'
      })
    } catch (err) {
      setEsitoPassword({ tipo: 'danger', testo: messaggioErrore(err) })
    }
  }

  const handleSalvaAccount = async (e) => {
    e.preventDefault()
    setEsitoModale(null)
    const valori = accountAperto.valori
    try {
      if (accountAperto.modalita === 'nuovo') {
        const res = await axios.post(`${API_BASE_URL}/api/utenti`, valori)
        setEsitoAccount({ tipo: 'success', testo: `Account ${res.data.username} creato: credenziali inviate a ${res.data.email}` })
      } else {
        const res = await axios.put(`${API_BASE_URL}/api/utenti/${valori.id}`, {
          nome: valori.nome,
          ruolo: valori.ruolo,
          email: valori.email
        })
        setEsitoAccount({ tipo: 'success', testo: `Account ${res.data.username} aggiornato` })
      }
      setAccountAperto(null)
      await ricaricaUtenti()
    } catch (err) {
      setEsitoModale({ tipo: 'danger', testo: messaggioErrore(err) })
    }
  }

  const handleReimposta = async (account) => {
    setEsitoAccount(null)
    if (!account.email) {
      // Senza email le credenziali non possono arrivare: le sceglie l'admin e le comunica di persona
      setPasswordManuale({ nuovaPassword: '', conferma: '' })
      setEsitoModale(null)
      setResetManuale(account)
      return
    }

    const confermato = window.confirm(
      `Invio a ${account.email} una nuova password casuale per ${account.username}.\n\n` +
      'Nessuno la vedrà qui: arriva solo per email e l\'utente dovrà cambiarla al primo accesso.\n' +
      'Le sue sessioni già aperte verranno chiuse. Continuare?'
    )
    if (!confermato) return

    try {
      const res = await axios.post(`${API_BASE_URL}/api/utenti/${account.id}/reimposta`)
      setEsitoAccount({ tipo: 'success', testo: `Nuova password inviata a ${res.data.inviataA}. Sessioni chiuse: ${res.data.sessioniChiuse}` })
      await ricaricaUtenti()
    } catch (err) {
      setEsitoAccount({ tipo: 'danger', testo: messaggioErrore(err) })
    }
  }

  const handleResetManuale = async (e) => {
    e.preventDefault()
    setEsitoModale(null)
    if (!corrisponde(passwordManuale)) {
      setEsitoModale({ tipo: 'danger', testo: 'La conferma non corrisponde alla nuova password' })
      return
    }
    try {
      await axios.put(`${API_BASE_URL}/api/utenti/${resetManuale.id}/password`, {
        nuovaPassword: passwordManuale.nuovaPassword
      })
      setEsitoAccount({ tipo: 'success', testo: `Password di ${resetManuale.username} aggiornata: comunicala all'interessato` })
      setResetManuale(null)
      await ricaricaUtenti()
    } catch (err) {
      setEsitoModale({ tipo: 'danger', testo: messaggioErrore(err) })
    }
  }

  const handleChangeMaster = async (e) => {
    e.preventDefault()
    setEsitoMaster(null)
    if (!corrisponde(master)) {
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

  const aggiornaCampo = (campo, valore) => {
    setAccountAperto({ ...accountAperto, valori: { ...accountAperto.valori, [campo]: valore } })
  }

  return (
    <div>
      <div className="page-header">
        <h1>Impostazioni</h1>
        <p>Account, credenziali e password master</p>
      </div>

      <div className="card scheda-impostazioni">
        <div className="card-header">
          <h5 className="card-title"><FaKey className="me-2" />Il mio account</h5>
          <span className="testo-secondario">
            accesso come <strong>{utente?.username}</strong> ({utente?.ruolo})
          </span>
        </div>

        {esitoEmail && <Alert variant={esitoEmail.tipo}>{esitoEmail.testo}</Alert>}
        <Form onSubmit={handleSalvaEmail} className="mb-4">
          <Form.Group className="mb-3">
            <Form.Label><FaEnvelope className="me-2" />La mia email</Form.Label>
            <Form.Control
              type="email"
              value={miaEmail}
              onChange={(e) => setMiaEmail(e.target.value)}
              placeholder="nome@esempio.it"
            />
            <Form.Text className="text-muted">
              È l'indirizzo dove arriva il collegamento per recuperare la password se la dimentichi
            </Form.Text>
          </Form.Group>
          <Button variant="outline-primary" type="submit">Salva email</Button>
        </Form>

        <hr className="separatore-impostazioni" />

        {esitoPassword && <Alert variant={esitoPassword.tipo}>{esitoPassword.testo}</Alert>}
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
          <Button variant="primary" type="submit">Cambia la mia password</Button>
        </Form>
      </div>

      {isAdmin && (
        <div className="card scheda-impostazioni">
          <div className="card-header">
            <h5 className="card-title"><FaUsers className="me-2" />Account</h5>
            <Button
              variant="primary"
              onClick={() => { setEsitoModale(null); setAccountAperto({ modalita: 'nuovo', valori: { ...CAMPI_VUOTI_UTENTE } }) }}
            >
              <FaPlus /> Nuovo utente
            </Button>
          </div>

          {esitoAccount && <Alert variant={esitoAccount.tipo}>{esitoAccount.testo}</Alert>}

          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Nome</th>
                  <th>Ruolo</th>
                  <th>Email</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {utenti.map(account => (
                  <tr key={account.id}>
                    <td>
                      <strong>{account.username}</strong>
                      {account.id === utente?.id && <span className="testo-secondario"> (tu)</span>}
                      {account.passwordDaCambiare && (
                        <span className="badge badge-warning ms-2" title="Sta usando una password provvisoria">da cambiare</span>
                      )}
                    </td>
                    <td>{account.nome}</td>
                    <td><span className="badge badge-info ruolo-account">{account.ruolo}</span></td>
                    <td>{account.email || <span className="testo-secondario">non impostata</span>}</td>
                    <td>
                      <div className="azioni-account">
                        <Button
                          variant="outline-primary"
                          size="sm"
                          title="Modifica nome, ruolo ed email"
                          aria-label={`Modifica ${account.username}`}
                          onClick={() => { setEsitoModale(null); setAccountAperto({ modalita: 'modifica', valori: { ...account } }) }}
                        >
                          <FaEdit />
                        </Button>
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          title={account.email
                            ? `Invia una nuova password a ${account.email}`
                            : 'Imposta una password (nessuna email associata)'}
                          onClick={() => handleReimposta(account)}
                        >
                          <FaUnlockAlt /> Reimposta password
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="testo-secondario mb-0">
            Reimpostare la password chiude le sessioni aperte di quell'account. Chi ha un'email riceve una password
            casuale che nessun altro conosce, nemmeno tu.
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
            <Button variant="primary" type="submit">Cambia la password master</Button>
          </Form>
        </div>
      )}

      <Modal show={!!accountAperto} onHide={() => setAccountAperto(null)}>
        <Modal.Header closeButton>
          <Modal.Title>
            {accountAperto?.modalita === 'nuovo' ? 'Nuovo utente' : `Modifica ${accountAperto?.valori.username}`}
          </Modal.Title>
        </Modal.Header>
        {accountAperto && (
          <Form onSubmit={handleSalvaAccount}>
            <Modal.Body>
              {esitoModale && <Alert variant="danger">{esitoModale.testo}</Alert>}
              {accountAperto.modalita === 'nuovo' && (
                <Form.Group className="mb-3">
                  <Form.Label>Username *</Form.Label>
                  <Form.Control
                    type="text"
                    value={accountAperto.valori.username}
                    onChange={(e) => aggiornaCampo('username', e.target.value)}
                    required
                  />
                </Form.Group>
              )}
              <Form.Group className="mb-3">
                <Form.Label>Nome e cognome *</Form.Label>
                <Form.Control
                  type="text"
                  value={accountAperto.valori.nome}
                  onChange={(e) => aggiornaCampo('nome', e.target.value)}
                  required
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Ruolo *</Form.Label>
                <Form.Select value={accountAperto.valori.ruolo} onChange={(e) => aggiornaCampo('ruolo', e.target.value)}>
                  {RUOLI.map(ruolo => <option key={ruolo} value={ruolo}>{ruolo}</option>)}
                </Form.Select>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Email *</Form.Label>
                <Form.Control
                  type="email"
                  value={accountAperto.valori.email}
                  onChange={(e) => aggiornaCampo('email', e.target.value)}
                  required={accountAperto.modalita === 'nuovo'}
                />
                <Form.Text className="text-muted">
                  {accountAperto.modalita === 'nuovo'
                    ? 'Le credenziali vengono generate dal gestionale e inviate a questo indirizzo'
                    : 'Serve per il recupero password e per l\'invio di una nuova password'}
                </Form.Text>
              </Form.Group>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setAccountAperto(null)}>Annulla</Button>
              <Button variant="primary" type="submit">
                {accountAperto.modalita === 'nuovo' ? 'Crea e invia le credenziali' : 'Salva'}
              </Button>
            </Modal.Footer>
          </Form>
        )}
      </Modal>

      <Modal show={!!resetManuale} onHide={() => setResetManuale(null)}>
        <Modal.Header closeButton>
          <Modal.Title>Password per {resetManuale?.username}</Modal.Title>
        </Modal.Header>
        {resetManuale && (
          <Form onSubmit={handleResetManuale}>
            <Modal.Body>
              {esitoModale && <Alert variant="danger">{esitoModale.testo}</Alert>}
              <Alert variant="warning">
                Questo account non ha un'email associata: la password va comunicata di persona e l'utente dovrà
                cambiarla al primo accesso.
              </Alert>
              <Form.Group className="mb-3">
                <Form.Label>Nuova password *</Form.Label>
                <Form.Control
                  type="password"
                  value={passwordManuale.nuovaPassword}
                  onChange={(e) => setPasswordManuale({ ...passwordManuale, nuovaPassword: e.target.value })}
                  autoComplete="new-password"
                  minLength={LUNGHEZZA_MINIMA}
                  required
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Conferma nuova password *</Form.Label>
                <Form.Control
                  type="password"
                  value={passwordManuale.conferma}
                  onChange={(e) => setPasswordManuale({ ...passwordManuale, conferma: e.target.value })}
                  autoComplete="new-password"
                  minLength={LUNGHEZZA_MINIMA}
                  required
                />
              </Form.Group>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setResetManuale(null)}>Annulla</Button>
              <Button variant="primary" type="submit">Imposta password</Button>
            </Modal.Footer>
          </Form>
        )}
      </Modal>
    </div>
  )
}

export default Impostazioni
