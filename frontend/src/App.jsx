import React, { useState, useEffect, useRef } from 'react'
import { Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom'
import axios from 'axios'
import { FiGrid, FiCalendar, FiUsers, FiSun, FiLogOut, FiMessageCircle, FiMenu, FiX, FiUser, FiSettings, FiClock } from 'react-icons/fi'
import { Alert } from 'react-bootstrap'
import { API_BASE_URL } from './config.js'
import { dataCentro, formattaData } from './utils/giornata.js'
import './workspace.css'
import Login from './components/Login'
import ReimpostaPassword from './components/ReimpostaPassword'
import Dashboard from './components/Dashboard'
import Appuntamenti from './components/Appuntamenti'
import Clienti from './components/Clienti'
import Servizi from './components/Servizi'
import Trattamenti from './components/Trattamenti'
import Operatori from './components/Operatori'
import WhatsApp from './components/WhatsApp'
import Impostazioni from './components/Impostazioni'

function App() {
  const [utente, setUtente] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [ora, setOra] = useState(() => new Date())
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 768px)').matches)
  const sidebarRef = useRef(null)
  const menuRef = useRef(null)
  const navigate = useNavigate()
  const { pathname } = useLocation()

  useEffect(() => {
    const utenteSalvato = localStorage.getItem('utente')
    if (utenteSalvato && localStorage.getItem('token')) {
      setUtente(JSON.parse(utenteSalvato))
    }
  }, [])

  useEffect(() => {
    const timer = setInterval(() => setOra(new Date()), 60000)
    const media = window.matchMedia('(max-width: 768px)')
    const aggiorna = () => { setMobile(media.matches); if (!media.matches) setSidebarOpen(false) }
    media.addEventListener('change', aggiorna)
    return () => { clearInterval(timer); media.removeEventListener('change', aggiorna) }
  }, [])

  useEffect(() => { setSidebarOpen(false) }, [pathname])

  useEffect(() => {
    if (!sidebarOpen || !mobile) return
    const precedente = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const elementi = () => [...sidebarRef.current.querySelectorAll('a, button')]
    elementi()[0]?.focus()
    const tastiera = evento => {
      if (evento.key === 'Escape') {
        setSidebarOpen(false)
        menuRef.current?.focus()
      }
      if (evento.key === 'Tab') {
        const lista = elementi()
        const primo = lista[0], ultimo = lista[lista.length - 1]
        if (evento.shiftKey && document.activeElement === primo) { evento.preventDefault(); ultimo?.focus() }
        else if (!evento.shiftKey && document.activeElement === ultimo) { evento.preventDefault(); primo?.focus() }
      }
    }
    document.addEventListener('keydown', tastiera)
    return () => { document.body.style.overflow = precedente; document.removeEventListener('keydown', tastiera) }
  }, [sidebarOpen, mobile])

  const handleLogin = (utenteData) => {
    setUtente(utenteData)
    localStorage.setItem('utente', JSON.stringify(utenteData))
  }

  // Dopo un cambio password o email i dati salvati nel browser vanno allineati
  const aggiornaUtenteLocale = (patch) => {
    const aggiornato = { ...utente, ...patch }
    setUtente(aggiornato)
    localStorage.setItem('utente', JSON.stringify(aggiornato))
  }

  const handleLogout = async () => {
    try {
      await axios.post(`${API_BASE_URL}/api/logout`)
    } catch {
      // sessione già scaduta o server irraggiungibile: scade comunque da sola
    }
    localStorage.removeItem('token')
    setUtente(null)
    localStorage.removeItem('utente')
    navigate('/')
  }

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  const closeSidebar = () => {
    setSidebarOpen(false)
  }

  // Il collegamento arrivato via email deve funzionare senza sessione, ma anche
  // quando chi lo apre ha già un accesso attivo in questo browser
  if (pathname === '/reimposta-password') {
    return <ReimpostaPassword />
  }

  if (!utente) {
    return <Login onLogin={handleLogin} />
  }

  return (
    <div className="app-container arda-workspace">
      <a className="workspace-skip" href="#workspace-content">Vai al contenuto</a>
      <div className={`sidebar-overlay ${sidebarOpen ? 'show' : ''}`} onClick={closeSidebar} aria-hidden="true" />
      <aside id="workspace-sidebar" ref={sidebarRef} className={`sidebar ${sidebarOpen ? 'open' : ''}`} aria-label="Menu principale" inert={mobile && !sidebarOpen ? '' : undefined}>
        <div className="sidebar-header">
          <img src="/logo.jpg" alt="Arda Centro Estetico Olistico" className="workspace-logo" />
          {mobile && <button className="workspace-close-menu" type="button" onClick={() => { closeSidebar(); menuRef.current?.focus() }} aria-label="Chiudi menu"><FiX aria-hidden="true" /></button>}
        </div>
        <p className="workspace-nav-label">Il tuo centro</p>
        <nav aria-label="Sezioni del gestionale">
          <ul className="nav-menu">
            {[
              ['/', 'La tua giornata', FiGrid], ['/appuntamenti', 'Appuntamenti', FiCalendar],
              ['/clienti', 'Clienti', FiUsers], ['/servizi', 'Servizi', FiSun],
              ['/operatori', 'Operatori', FiUser], ['/trattamenti', 'Storico trattamenti', FiClock],
              ['/whatsapp', 'WhatsApp', FiMessageCircle]
            ].map(([url, nome, Icona]) => <li className="nav-item" key={url}><NavLink to={url} end={url === '/'} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeSidebar}><Icona aria-hidden="true" /><span>{nome}</span></NavLink></li>)}
          </ul>
        </nav>
        <div className="workspace-sidebar-bottom">
          <NavLink to="/impostazioni" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeSidebar}><FiSettings aria-hidden="true" /><span>Impostazioni</span></NavLink>
          <div className="workspace-profile"><span className="workspace-avatar" aria-hidden="true">{String(utente.nome || utente.username || '').trim().split(/\s+/).slice(0, 2).map(n => n.charAt(0)).join('')}</span><div><strong>{utente.nome || utente.username}</strong><span>{utente.ruolo}</span></div><button type="button" onClick={handleLogout} aria-label="Esci dal gestionale" title="Esci"><FiLogOut aria-hidden="true" /></button></div>
        </div>
      </aside>

      <main className="main-content" id="workspace-content" tabIndex={-1}>
        <header className="workspace-topbar"><div className="workspace-breadcrumb"><button ref={menuRef} className="workspace-menu-toggle" type="button" onClick={toggleSidebar} aria-label="Apri menu" aria-controls="workspace-sidebar" aria-expanded={sidebarOpen}><FiMenu aria-hidden="true" /></button><span>Arda</span><span aria-hidden="true">/</span><span>Il tuo centro</span></div><time dateTime={dataCentro(ora)}>{formattaData(dataCentro(ora), { weekday: 'long', year: 'numeric' })}</time></header>
        {utente.passwordDaCambiare && (
          <Alert variant="warning" className="avviso-credenziali">
            <strong>Stai entrando con una password predefinita dell'installazione</strong>, già comparsa nel
            repository: chiunque la conosca può leggere i dati dei clienti.{' '}
            <NavLink to="/impostazioni">Cambiala adesso</NavLink>.
          </Alert>
        )}
        <Routes>
          <Route path="/" element={<Dashboard utente={utente} />} />
          <Route path="/appuntamenti" element={<Appuntamenti utente={utente} />} />
          <Route path="/clienti" element={<Clienti utente={utente} />} />
          <Route path="/servizi" element={<Servizi utente={utente} />} />
          <Route path="/operatori" element={<Operatori />} />
          <Route path="/trattamenti" element={<Trattamenti utente={utente} />} />
          <Route path="/whatsapp" element={<WhatsApp />} />
          <Route path="/impostazioni" element={<Impostazioni utente={utente} onUtenteAggiornato={aggiornaUtenteLocale} />} />
        </Routes>
        <footer className="workspace-footer">Arda · Centro Estetico Olistico</footer>
      </main>
    </div>
  )
}

export default App
