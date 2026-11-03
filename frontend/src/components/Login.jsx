import React, { useState } from 'react'
import axios from 'axios'
import { FiArrowLeft, FiArrowRight, FiArrowUpRight, FiEye, FiEyeOff, FiInstagram, FiLock, FiStar } from 'react-icons/fi'
import { FaWhatsapp } from 'react-icons/fa'
import './Login.css'
import { API_BASE_URL } from '../config.js'

function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [mostraPassword, setMostraPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [recupero, setRecupero] = useState(false)
  const [identificativo, setIdentificativo] = useState('')
  const [esitoRecupero, setEsitoRecupero] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await axios.post(`${API_BASE_URL}/api/login`, {
        username,
        password
      })
      localStorage.setItem('token', res.data.token)
      onLogin(res.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Errore di connessione')
    } finally {
      setLoading(false)
    }
  }

  const handleRecupero = async (e) => {
    e.preventDefault()
    setEsitoRecupero(null)
    setLoading(true)

    try {
      const res = await axios.post(`${API_BASE_URL}/api/recupera-password`, { identificativo })
      setEsitoRecupero({
        tipo: 'success',
        testo: res.data.messaggio || 'Se l\'account esiste, riceverai un collegamento per scegliere una nuova password'
      })
      setIdentificativo('')
    } catch (err) {
      setEsitoRecupero({ tipo: 'danger', testo: err.response?.data?.error || 'Non riesco a inviare il collegamento' })
    } finally {
      setLoading(false)
    }
  }

  const apriRecupero = () => {
    setError('')
    setEsitoRecupero(null)
    setRecupero(true)
  }

  const chiudiRecupero = () => {
    setEsitoRecupero(null)
    setIdentificativo('')
    setRecupero(false)
  }

  return (
    <main className="arda-login">
      <div className="arda-login-shell">
        <aside className="arda-login-brand" aria-label="Arda Centro Estetico Olistico">
          <p className="arda-login-brand-eyebrow">Centro Estetico Olistico</p>
          <img className="arda-login-logo" src="/logo.jpg" alt="Arda Centro Estetico Olistico" />
          <span className="arda-login-brand-line" aria-hidden="true" />
          <h2>La cura, in ogni dettaglio.</h2>
          <p className="arda-login-brand-description">Uno spazio dedicato al benessere.<br />Anche nel tuo lavoro di ogni giorno.</p>
          <p className="arda-login-brand-footer">Bellezza · Equilibrio · Armonia</p>
        </aside>

        <section className="arda-login-panel" aria-labelledby="arda-login-title">
          <p className="arda-login-eyebrow">Il tuo spazio Arda</p>
          <h1 id="arda-login-title">{recupero ? 'Ritrova il tuo accesso.' : 'Bentornata, bentornato.'}</h1>
          <p className="arda-login-intro">
            {recupero ? 'Ti invieremo un collegamento per scegliere una nuova password.' : <>Accedi al gestionale e prenditi cura<br />della tua giornata.</>}
          </p>

          {error && <div className="arda-login-message arda-login-message-error" role="alert">{error}</div>}

          {recupero ? (
            <form key="recupero" onSubmit={handleRecupero} aria-label="Recupero password" aria-busy={loading}>
              {esitoRecupero && (
                <div className={`arda-login-message ${esitoRecupero.tipo === 'success' ? 'arda-login-message-success' : 'arda-login-message-error'}`} role={esitoRecupero.tipo === 'success' ? 'status' : 'alert'}>
                  {esitoRecupero.testo}
                </div>
              )}
              <label className="arda-login-label" htmlFor="arda-recupero">Username o email dell’account</label>
              <input id="arda-recupero" className="arda-login-input" type="text" value={identificativo} onChange={e => setIdentificativo(e.target.value)} placeholder="Inserisci username o email" autoComplete="username" required disabled={loading} aria-describedby="arda-recupero-help" />
              <p id="arda-recupero-help" className="arda-login-help">Il collegamento arriva all’email associata all’account, vale 30 minuti e si usa una volta sola.</p>
              <button className="arda-login-submit" type="submit" disabled={loading}>{loading ? 'Invio in corso…' : 'Invia il collegamento'}<FiArrowRight aria-hidden="true" /></button>
              <button className="arda-login-back" type="button" onClick={chiudiRecupero} disabled={loading}><FiArrowLeft aria-hidden="true" />Torna al login</button>
            </form>
          ) : (
            <form key="login" onSubmit={handleSubmit} aria-label="Accesso al gestionale" aria-busy={loading}>
              <label className="arda-login-label" htmlFor="arda-username">Username</label>
              <input id="arda-username" className="arda-login-input" type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Inserisci il tuo username" autoComplete="username" required disabled={loading} autoCapitalize="none" spellCheck={false} />
              <label className="arda-login-label" htmlFor="arda-password">Password</label>
              <div className="arda-login-password">
                <input id="arda-password" className="arda-login-input" type={mostraPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Inserisci la tua password" autoComplete="current-password" required disabled={loading} />
                <button className="arda-login-eye" type="button" onClick={() => setMostraPassword(!mostraPassword)} aria-label={mostraPassword ? 'Nascondi password' : 'Mostra password'} aria-pressed={mostraPassword} aria-controls="arda-password">{mostraPassword ? <FiEyeOff aria-hidden="true" /> : <FiEye aria-hidden="true" />}</button>
              </div>
              <div className="arda-login-forgot"><button type="button" onClick={apriRecupero} disabled={loading}>Password dimenticata?</button></div>
              <button className="arda-login-submit" type="submit" disabled={loading}>{loading ? 'Accesso in corso…' : 'Accedi al gestionale'}<FiArrowRight aria-hidden="true" /></button>
              <p className="arda-login-reserved"><FiLock aria-hidden="true" />Accesso riservato al personale Arda</p>
            </form>
          )}

          <div className="arda-login-divider"><span>Restiamo in contatto</span></div>
          <nav className="arda-login-socials" aria-label="Social e contatti Arda">
            <a href="https://www.instagram.com/arda.centroesteticoolistico" target="_blank" rel="noopener noreferrer" aria-label="Instagram Arda, si apre in una nuova scheda"><FiInstagram aria-hidden="true" /><span>Instagram</span><FiArrowUpRight className="arda-login-external" aria-hidden="true" /></a>
            <a href="https://wa.me/393391853082" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp Arda, si apre in una nuova scheda"><FaWhatsapp aria-hidden="true" /><span>WhatsApp</span><FiArrowUpRight className="arda-login-external" aria-hidden="true" /></a>
            <a href="https://www.google.com/maps/search/?api=1&query=Arda+Centro+Estetico+Olistico" target="_blank" rel="noopener noreferrer" aria-label="Recensioni Arda su Google Maps, si apre in una nuova scheda"><FiStar aria-hidden="true" /><span>Recensioni</span><FiArrowUpRight className="arda-login-external" aria-hidden="true" /></a>
          </nav>
          <p className="arda-login-links-note">I collegamenti si aprono in una nuova scheda.</p>
        </section>
      </div>
      <footer className="arda-login-footer">© Arda · Centro Estetico Olistico</footer>
    </main>
  )
}

export default Login
