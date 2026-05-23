import { useState, useEffect } from 'react'
import { createSession, joinSession, getActiveSession, subscribeToGroupSessions } from '../lib/session'

export default function LobbyPage({ membership, onJoined, onLogout }) {
  const [mode, setMode] = useState(null)
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [activeSession, setActiveSession] = useState(null)

  const username = membership.username
  const groupId = membership.group_id
  const isMaster = membership.role === 'master'

  useEffect(() => {
    if (!groupId) return

    getActiveSession(groupId).then(setActiveSession)

    const sub = subscribeToGroupSessions(groupId, () => {
      getActiveSession(groupId).then(setActiveSession)
    })

    return () => sub.unsubscribe()
  }, [groupId])

  const handleCreate = async () => {
    setLoading(true)
    setError(null)
    try {
      const { session, player } = await createSession(username, {}, groupId)
      onJoined({ session, player })
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleJoin = async (sessionCode) => {
    setLoading(true)
    setError(null)
    try {
      const { session, player } = await joinSession(sessionCode ?? code.trim(), username)
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

        <div style={styles.groupInfo}>
          <span style={styles.groupName}>👥 {membership.groups?.name}</span>
          <span style={styles.username}>{username}</span>
          {isMaster && <span style={styles.masterBadge}>👑 Master</span>}
        </div>

        {/* Session active — visible uniquement pour les joueurs */}
        {activeSession && !mode && !isMaster && (
          <div style={styles.activeSessionBox}>
            <p style={styles.activeSessionLabel}>Session en cours</p>
            <span style={styles.activeSessionCode}>#{activeSession.code}</span>
            <button
              style={styles.btnPrimary}
              onClick={() => handleJoin(activeSession.code)}
              disabled={loading}
            >
              {loading ? 'Connexion...' : 'Rejoindre la session'}
            </button>
          </div>
        )}

        {!mode && (
          <div style={styles.buttons}>
            {isMaster && (
              <button style={styles.btnPrimary} onClick={handleCreate} disabled={loading}>
                {loading ? 'Création...' : 'Créer une session'}
              </button>
            )}
            {!activeSession && !isMaster && (
              <button style={styles.btnSecondary} onClick={() => setMode('join')}>
                Rejoindre avec un code
              </button>
            )}
          </div>
        )}

        {mode === 'join' && (
          <div style={styles.form}>
            <input
              style={styles.input}
              placeholder="Code de session (ex: ABC123)"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={6}
            />
            {error && <p style={styles.error}>{error}</p>}
            <button style={styles.btnPrimary} onClick={() => handleJoin()} disabled={loading}>
              {loading ? 'Connexion...' : 'Rejoindre'}
            </button>
            <button style={styles.btnSecondary} onClick={() => { setMode(null); setError(null) }}>
              Retour
            </button>
          </div>
        )}

        {!mode && error && <p style={styles.error}>{error}</p>}

        {isMaster && membership.groups?.invite_code && (
          <div style={styles.inviteBox}>
            <p style={styles.inviteLabel}>Code d'invitation du groupe</p>
            <span style={styles.inviteCode}>{membership.groups.invite_code}</span>
          </div>
        )}

        <button style={styles.logoutBtn} onClick={onLogout}>
          Se déconnecter
        </button>
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', backgroundColor: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' },
  card: { backgroundColor: '#111', border: '1px solid #222', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '360px', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' },
  title: { color: 'white', fontSize: '28px', margin: 0 },
  groupInfo: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', width: '100%' },
  groupName: { color: '#22c55e', fontSize: '14px', fontWeight: 'bold' },
  username: { color: '#888', fontSize: '13px' },
  masterBadge: { color: '#f59e0b', fontSize: '12px' },
  buttons: { display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' },
  form: { display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' },
  input: { padding: '12px', borderRadius: '8px', border: '1px solid #333', backgroundColor: '#1a1a1a', color: 'white', fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box' },
  btnPrimary: { padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: '#22c55e', color: 'white', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', width: '100%' },
  btnSecondary: { padding: '12px', borderRadius: '8px', border: '1px solid #333', backgroundColor: 'transparent', color: '#aaa', fontSize: '14px', cursor: 'pointer', width: '100%' },
  activeSessionBox: { width: '100%', backgroundColor: '#1a1a1a', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', border: '1px solid #22c55e' },
  activeSessionLabel: { color: '#666', fontSize: '11px', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' },
  activeSessionCode: { color: '#22c55e', fontSize: '20px', fontWeight: 'bold', letterSpacing: '0.1em' },
  inviteBox: { width: '100%', backgroundColor: '#1a1a1a', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' },
  inviteLabel: { color: '#666', fontSize: '11px', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' },
  inviteCode: { color: '#f59e0b', fontSize: '20px', fontWeight: 'bold', letterSpacing: '0.1em' },
  logoutBtn: { padding: '8px', borderRadius: '8px', border: 'none', backgroundColor: 'transparent', color: '#444', fontSize: '12px', cursor: 'pointer', marginTop: '8px' },
  error: { color: '#ef4444', fontSize: '13px', margin: 0 },
}