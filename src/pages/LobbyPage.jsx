import { useState } from 'react'
import { createSession, joinSession } from '../lib/session'

export default function LobbyPage({ onJoined }) {
  const [mode, setMode] = useState(null) // 'create' | 'join'
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleCreate = async () => {
    if (!name.trim()) return setError('Entrez votre pseudo')
    setLoading(true)
    setError(null)
    try {
      const { session, player } = await createSession(name.trim(), {})
      onJoined({ session, player })
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleJoin = async () => {
    if (!name.trim()) return setError('Entrez votre pseudo')
    if (!code.trim()) return setError('Entrez le code de session')
    setLoading(true)
    setError(null)
    try {
      const { session, player } = await joinSession(code.trim(), name.trim())
      onJoined({ session, player })
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>🃏 Poker Range</h1>
        <p style={styles.subtitle}>Outil de review collaborative</p>

        {!mode && (
          <div style={styles.buttons}>
            <button style={styles.btnPrimary} onClick={() => setMode('create')}>
              Créer une session
            </button>
            <button style={styles.btnSecondary} onClick={() => setMode('join')}>
              Rejoindre une session
            </button>
          </div>
        )}

        {mode && (
          <div style={styles.form}>
            <input
              style={styles.input}
              placeholder="Votre pseudo"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            {mode === 'join' && (
              <input
                style={styles.input}
                placeholder="Code de session (ex: ABC123)"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={6}
              />
            )}

            {error && <p style={styles.error}>{error}</p>}

            <button
              style={styles.btnPrimary}
              onClick={mode === 'create' ? handleCreate : handleJoin}
              disabled={loading}
            >
              {loading ? 'Chargement...' : mode === 'create' ? 'Créer' : 'Rejoindre'}
            </button>

            <button style={styles.btnSecondary} onClick={() => { setMode(null); setError(null) }}>
              Retour
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#0a0a0a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
  },
  card: {
    backgroundColor: '#111',
    border: '1px solid #222',
    borderRadius: '16px',
    padding: '32px',
    width: '100%',
    maxWidth: '360px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    alignItems: 'center',
  },
  title: {
    color: 'white',
    fontSize: '28px',
    margin: 0,
  },
  subtitle: {
    color: '#666',
    fontSize: '14px',
    margin: 0,
  },
  buttons: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    width: '100%',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    width: '100%',
  },
  input: {
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #333',
    backgroundColor: '#1a1a1a',
    color: 'white',
    fontSize: '14px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  btnPrimary: {
    padding: '12px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#22c55e',
    color: 'white',
    fontWeight: 'bold',
    fontSize: '14px',
    cursor: 'pointer',
    width: '100%',
  },
  btnSecondary: {
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #333',
    backgroundColor: 'transparent',
    color: '#aaa',
    fontSize: '14px',
    cursor: 'pointer',
    width: '100%',
  },
  error: {
    color: '#ef4444',
    fontSize: '13px',
    margin: 0,
  },
}