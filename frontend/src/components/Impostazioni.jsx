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
  const [gestionePassword, setGestionePassword] = useState(null)
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

  const apriGestionePassword = (account) => {
    setEsitoModale(null)
    setGestionePassword({
      account,
      opzione: account.email ? 'link' : 'manuale',
      nuovaPassword: '',
      conferma: ''
    })
  }

  const handleGestionePassword = async (e) => {
    e.preventDefault()
    setEsitoModale(null)
    const { account, opzione, nuovaPassword, conferma } = gestionePassword

    if (opzione === 'manuale' && nuovaPassword !== conferma) {
      setEsitoModale({ tipo: 'danger', testo: 'La conferma non corrisponde alla nuova password' })
      return
    }

    try {
      if (opzione === 'link') {
        const res = await axios.post(`${API_BASE_URL}/api/utenti/${account.id}/link-reimpostazione`)
        setEsitoAccount({
          tipo: 'success',
          testo: `Collegamento di reimpostazione inviato a ${res.data.inviataA}: sarà ${account.username} a scegliere la nuova password`
        })
      } else if (opzione === 'casuale') {
        const res = await axios.post(`${API_BASE_URL}/api/utenti/${account.id}/reimposta`)
        setEsitoAccount({
          tipo: 'success',
          testo: `Nuova password inviata a ${res.data.inviataA}. Sessioni chiuse: ${res.data.sessioniChiuse}`
        })
      } else {
        await axios.put(`${API_BASE_URL}/api/utenti/${account.id}/password`, { nuovaPassword })
        setEsitoAccount({ tipo: 'success', testo: `Password di ${account.username} aggiornata: comunicala all'interessato` })
      }
      setGestionePassword(null)
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
                          title="Invia il link di reimpostazione, una password casuale oppure impostane una tu"
                          aria-label={`Gestisci la password di ${account.username}`}
                          onClick={() => apriGestionePassword(account)}
                        >
                          <FaKey /> Password
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="testo-secondario mb-0">
            Dal bottone Password scegli se mandare il collegamento di reimpostazione (l'utente sceglie da solo e
            nessuno conosce la sua password), se generare una password casuale spedita per email, oppure se
            impostarne una tu da comunicare a voce. Le ultime due chiudono le sessioni aperte dell'account.
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

      <Modal show={!!gestionePassword} onHide={() => setGestionePassword(null)}>
        <Modal.Header closeButton>
          <Modal.Title>Password di {gestionePassword?.account.username}</Modal.Title>
        </Modal.Header>
        {gestionePassword && (
          <Form onSubmit={handleGestionePassword}>
            <Modal.Body>
              {esitoModale && <Alert variant="danger">{esitoModale.testo}</Alert>}

              <div className="opzione-password">
                <Form.Check
                  type="radio"
                  id="opzione-link"
                  name="opzione-password"
                  checked={gestionePassword.opzione === 'link'}
                  disabled={!gestionePassword.account.email}
                  onChange={() => setGestionePassword({ ...gestionePassword, opzione: 'link' })}
                  label={<strong>Invia il link di reimpostazione</strong>}
                />
                <p className="testo-secondario">
                  {gestionePassword.account.email
                    ? `A ${gestionePassword.account.email} arriva un collegamento valido 30 minuti: l'utente sceglie la nuova password e tu non la conosci mai.`
                    : 'Serve un\'email associata all\'account: aggiungila con il bottone Modifica.'}
                </p>
              </div>

              <div className="opzione-password">
                <Form.Check
                  type="radio"
                  id="opzione-casuale"
                  name="opzione-password"
                  checked={gestionePassword.opzione === 'casuale'}
                  disabled={!gestionePassword.account.email}
                  onChange={() => setGestionePassword({ ...gestionePassword, opzione: 'casuale' })}
                  label={<strong>Genera una password casuale e inviala per email</strong>}
                />
                <p className="testo-secondario">
                  La password arriva solo per email e va cambiata al primo accesso. Le sessioni aperte vengono chiuse.
                </p>
              </div>

              <div className="opzione-password">
                <Form.Check
                  type="radio"
                  id="opzione-manuale"
                  name="opzione-password"
                  checked={gestionePassword.opzione === 'manuale'}
                  onChange={() => setGestionePassword({ ...gestionePassword, opzione: 'manuale' })}
                  label={<strong>Imposta tu una password</strong>}
                />
                <p className="testo-secondario">
                  Da comunicare a voce o con un altro canale; va cambiata al primo accesso. Le sessioni aperte vengono chiuse.
                </p>
                {gestionePassword.opzione === 'manuale' && (
                  <>
                    <Form.Group className="mb-2 mt-2">
                      <Form.Label>Nuova password *</Form.Label>
                      <Form.Control
                        type="password"
                        value={gestionePassword.nuovaPassword}
                        onChange={(e) => setGestionePassword({ ...gestionePassword, nuovaPassword: e.target.value })}
                        autoComplete="new-password"
                        minLength={LUNGHEZZA_MINIMA}
                        required
                      />
                      <Form.Text className="text-muted">Almeno {LUNGHEZZA_MINIMA} caratteri</Form.Text>
                    </Form.Group>
                    <Form.Group className="mb-0">
                      <Form.Label>Conferma nuova password *</Form.Label>
                      <Form.Control
                        type="password"
                        value={gestionePassword.conferma}
                        onChange={(e) => setGestionePassword({ ...gestionePassword, conferma: e.target.value })}
                        autoComplete="new-password"
                        minLength={LUNGHEZZA_MINIMA}
                        required
                      />
                    </Form.Group>
                  </>
                )}
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setGestionePassword(null)}>Annulla</Button>
              <Button variant="primary" type="submit">
                {gestionePassword.opzione === 'manuale' ? 'Imposta password' : 'Invia per email'}
              </Button>
            </Modal.Footer>
          </Form>
        )}
      </Modal>
    </div>
  )
}

export default Impostazioni
