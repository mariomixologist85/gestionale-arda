import React, { useState } from 'react'
import axios from 'axios'
import { Form, Button, Card, Alert } from 'react-bootstrap'
import { FaLock, FaUser } from 'react-icons/fa'

function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await axios.post('http://localhost:3001/api/login', {
        username,
        password
      })
      onLogin(res.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Errore di connessione')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #2C1810 0%, #1A0F0A 50%, #2C1810 100%)'
    }}>
      <Card style={{ width: '420px', borderRadius: '16px', boxShadow: '0 10px 40px rgba(0,0,0,0.4)', border: '1px solid rgba(201, 169, 97, 0.2)' }}>
        <Card.Body style={{ padding: '2.5rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <img
              src="/logo.jpg"
              alt="Arda Logo"
              style={{
                width: '120px',
                height: '120px',
                objectFit: 'contain',
                marginBottom: '1rem'
              }}
            />
            <h2 style={{ fontWeight: '700', marginBottom: '0.5rem', color: '#2C1810', letterSpacing: '2px' }}>ARDA</h2>
            <p style={{ color: '#6B5B4F', fontSize: '0.85rem', letterSpacing: '1px', textTransform: 'uppercase' }}>Centro Estetico Olistico</p>
          </div>

          {error && (
            <Alert variant="danger" style={{ borderRadius: '8px' }}>
              {error}
            </Alert>
          )}

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label style={{ fontWeight: '500' }}>
                <FaUser className="me-2" />
                Username
              </Form.Label>
              <Form.Control
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Inserisci username"
                required
                style={{ borderRadius: '8px', padding: '0.75rem' }}
              />
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label style={{ fontWeight: '500' }}>
                <FaLock className="me-2" />
                Password
              </Form.Label>
              <Form.Control
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Inserisci password"
                required
                style={{ borderRadius: '8px', padding: '0.75rem' }}
              />
            </Form.Group>

            <Button
              variant="primary"
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '1rem',
                background: '#C9A961',
                border: 'none',
                color: '#2C1810'
              }}
            >
              {loading ? 'Accesso in corso...' : 'Accedi'}
            </Button>
          </Form>

          <div style={{
            marginTop: '2rem',
            padding: '1rem',
            background: '#F9F5F0',
            borderRadius: '8px',
            fontSize: '0.85rem',
            color: '#6B5B4F',
            border: '1px solid #E8D5B7'
          }}>
            <strong style={{ color: '#2C1810' }}>Credenziali di test:</strong><br />
            Admin: admin / admin123<br />
            Dipendente: dipendente / dip123
          </div>
        </Card.Body>
      </Card>
    </div>
  )
}

export default Login
