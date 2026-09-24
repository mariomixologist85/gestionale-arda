import React, { useState, useEffect } from 'react'
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom'
import { FaHome, FaCalendarAlt, FaUsers, FaClipboardList, FaConciergeBell, FaSignOutAlt, FaWhatsapp } from 'react-icons/fa'
import { Button } from 'react-bootstrap'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import Appuntamenti from './components/Appuntamenti'
import Clienti from './components/Clienti'
import Servizi from './components/Servizi'
import Trattamenti from './components/Trattamenti'
import WhatsApp from './components/WhatsApp'

function App() {
  const [utente, setUtente] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    const utenteSalvato = localStorage.getItem('utente')
    if (utenteSalvato) {
      setUtente(JSON.parse(utenteSalvato))
    }
  }, [])

  const handleLogin = (utenteData) => {
    setUtente(utenteData)
    localStorage.setItem('utente', JSON.stringify(utenteData))
  }

  const handleLogout = () => {
    setUtente(null)
    localStorage.removeItem('utente')
    navigate('/')
  }

  if (!utente) {
    return <Login onLogin={handleLogin} />
  }

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
            <img
              src="/logo.jpg"
              alt="Arda Logo"
              style={{
                width: '120px',
                height: '120px',
                objectFit: 'contain',
                borderRadius: '12px'
              }}
            />
          </div>
          <h2 style={{ textAlign: 'center', color: '#C9A961', fontSize: '1.75rem', fontWeight: '700', letterSpacing: '2px' }}>ARDA</h2>
          <p style={{ textAlign: 'center', color: '#D4B896', fontSize: '0.75rem', letterSpacing: '1px', textTransform: 'uppercase' }}>Centro Estetico Olistico</p>
          <div style={{
            marginTop: '1rem',
            padding: '0.75rem',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '8px',
            fontSize: '0.85rem'
          }}>
            <div style={{ fontWeight: '600' }}>{utente.nome}</div>
            <div style={{ opacity: 0.8, textTransform: 'capitalize' }}>{utente.ruolo}</div>
          </div>
        </div>
        <ul className="nav-menu">
          <li className="nav-item">
            <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <FaHome /> Dashboard
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink to="/appuntamenti" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <FaCalendarAlt /> Appuntamenti
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink to="/clienti" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <FaUsers /> Clienti
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink to="/servizi" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <FaConciergeBell /> Servizi
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink to="/trattamenti" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <FaClipboardList /> Storico Trattamenti
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink to="/whatsapp" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <FaWhatsapp /> WhatsApp
            </NavLink>
          </li>
        </ul>
        <div style={{ padding: '1rem', marginTop: 'auto' }}>
          <Button
            variant="outline-light"
            onClick={handleLogout}
            style={{ width: '100%', borderRadius: '8px' }}
          >
            <FaSignOutAlt className="me-2" /> Esci
          </Button>
        </div>
      </aside>

      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard utente={utente} />} />
          <Route path="/appuntamenti" element={<Appuntamenti utente={utente} />} />
          <Route path="/clienti" element={<Clienti utente={utente} />} />
          <Route path="/servizi" element={<Servizi utente={utente} />} />
          <Route path="/trattamenti" element={<Trattamenti utente={utente} />} />
          <Route path="/whatsapp" element={<WhatsApp />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
