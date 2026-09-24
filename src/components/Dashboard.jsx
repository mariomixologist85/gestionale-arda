import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { FaUsers, FaCalendarCheck, FaConciergeBell, FaClipboardList } from 'react-icons/fa'

function Dashboard() {
  const [stats, setStats] = useState({
    totClienti: 0,
    appuntamentiOggi: 0,
    totServizi: 0,
    totTrattamenti: 0
  })
  const [appuntamentiOggi, setAppuntamentiOggi] = useState([])

  useEffect(() => {
    loadStats()
    loadAppuntamentiOggi()
  }, [])

  const loadStats = async () => {
    try {
      const res = await axios.get('http://localhost:3001/api/dashboard/stats')
      setStats(res.data)
    } catch (err) {
      console.error('Errore caricamento stats:', err)
    }
  }

  const loadAppuntamentiOggi = async () => {
    try {
      const oggi = new Date().toISOString().split('T')[0]
      const res = await axios.get(`http://localhost:3001/api/appuntamenti?data=${oggi}`)
      setAppuntamentiOggi(res.data)
    } catch (err) {
      console.error('Errore caricamento appuntamenti:', err)
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
        <span>Benvenuta nel tuo centro estetico Arda</span>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon purple">
            <FaUsers />
          </div>
          <div className="stat-info">
            <h3>{stats.totClienti}</h3>
            <span>Clienti totali</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon pink">
            <FaCalendarCheck />
          </div>
          <div className="stat-info">
            <h3>{stats.appuntamentiOggi}</h3>
            <span>Appuntamenti oggi</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon cyan">
            <FaConciergeBell />
          </div>
          <div className="stat-info">
            <h3>{stats.totServizi}</h3>
            <span>Servizi disponibili</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon green">
            <FaClipboardList />
          </div>
          <div className="stat-info">
            <h3>{stats.totTrattamenti}</h3>
            <span>Trattamenti effettuati</span>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h5 className="card-title">Appuntamenti di Oggi</h5>
        </div>
        {appuntamentiOggi.length === 0 ? (
          <div className="empty-state">
            <p>Nessun appuntamento previsto per oggi</p>
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
                  <th>Stato</th>
                </tr>
              </thead>
              <tbody>
                {appuntamentiOggi.map(app => (
                  <tr key={app.id}>
                    <td><strong>{app.ora}</strong></td>
                    <td>{app.clienteNome}</td>
                    <td>{app.servizioNome}</td>
                    <td>{app.operatoreNome}</td>
                    <td>
                      <span className={`badge badge-${app.stato === 'confermato' ? 'success' : app.stato === 'pending' ? 'warning' : 'info'}`}>
                        {app.stato}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard
