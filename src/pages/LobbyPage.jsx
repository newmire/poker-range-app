/**
 * LobbyPage.jsx — Page d'accueil après connexion au groupe
 */

import { useState, useEffect } from 'react'
import {
  createSession,
  joinSession,
  getActiveSession,
  subscribeToGroupSessions,
  updateLastSeen,
  leaveGroup,
} from '../lib/session'
import { supabase } from '../lib/supabase'
import LibraryPage from './LibraryPage'
import MembersPage from './MembersPage'
import GroupPage from './GroupPage'

export default function LobbyPage({ membership, onJoined, onLogout, onSwitchGroup, onLeaveGroup, authUser, supabaseReady = false }) {
  const [mode, setMode] = useState(null)
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [activeSession, setActiveSession] = useState(null)

  // ─── Fallback : débloque le bouton après 5s si supabaseReady n'arrive pas ──
  const [localReady, setLocalReady] = useState(supabaseReady)
  useEffect(() => {
    if (supabaseReady) { setLocalReady(true); return }
    const t = setTimeout(() => setLocalReady(true), 5000)
    return () => clearTimeout(t)
  }, [supabaseReady])
  const ready = supabaseReady || localReady

  const [showLibrary, setShowLibrary] = useState(false)
  const [showMembers, setShowMembers] = useState(false)
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [copiedSession, setCopiedSession] = useState(false)
  const [copiedInvite, setCopiedInvite] = useState(false)

  const canShare = typeof navigator !== 'undefined' && !!navigator.share
  const username = membership.username
  const groupId = membership.group_id
  const isMaster = membership.role === 'master'

  useEffect(() => {
    if (!membership?.id) return
    updateLastSeen(membership.id)
    const interval = setInterval(() => updateLastSeen(membership.id), 30000)
    return () => clearInterval(interval)
  }, [membership])

  useEffect(() => {
    if (!groupId) return
    getActiveSession(groupId).then(setActiveSession)
    const sub = subscribeToGroupSessions(groupId, () => {
      getActiveSession(groupId).then(setActiveSession)
    })
    return () => sub.unsubscribe()
  }, [groupId])

  const withTimeout = (promise, ms, message) => Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms)),
  ])

  const handleCreate = async () => {
    setLoading(true)
    setError(null)
    try {
      // getUser() fait un appel direct au serveur d'auth (pas de queue interne).
      // C'est le pattern Supabase pour débloquer le client après un refresh de page mobile.
      const { data: { user }, error: userError } = await withTimeout(
        supabase.auth.getUser(),
        8000,
        'auth_timeout'
      )
      if (userError || !user) {
        setError('Session expirée, veuillez vous reconnecter.')
        return
      }
      const { session, player } = await withTimeout(
        createSession(username, {}, groupId),
        15000,
        'La création a pris trop de temps. Vérifiez votre connexion et réessayez.'
      )
      onJoined({ session, player })
    } catch (e) {
      const msg = e.message ?? ''
      if (msg === 'auth_timeout' || msg.includes('JWT') || msg.includes('auth') || msg.includes('401') || msg.includes('403')) {
        setError('Session expirée, veuillez vous reconnecter.')
      } else {
        setError(msg || 'Une erreur est survenue, réessayez.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleJoin = async (sessionCode) => {
    setLoading(true)
    setError(null)
    try {
      const { data: { user }, error: userError } = await withTimeout(
        supabase.auth.getUser(),
        8000,
        'auth_timeout'
      )
      if (userError || !user) {
        setError('Session expirée, veuillez vous reconnecter.')
        return
      }
      const { session, player } = await withTimeout(
        joinSession(sessionCode ?? code.trim(), username),
        15000,
        'La connexion a pris trop de temps. Vérifiez votre connexion et réessayez.'
      )
      onJoined({ session, player })
    } catch (e) {
      const msg = e.message ?? ''
      if (msg === 'auth_timeout' || msg.includes('JWT') || msg.includes('auth') || msg.includes('401') || msg.includes('403')) {
        setError('Session expirée, veuillez vous reconnecter.')
      } else {
        setError(msg || 'Session introuvable ou erreur réseau.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleLeaveGroup = async () => {
    await leaveGroup(membership.id)
    setShowLeaveConfirm(false)
    onLeaveGroup()
  }

  const handleCopySessionCode = () => {
    if (!activeSession?.code) return
    navigator.clipboard.writeText(activeSession.code)
    setCopiedSession(true)
    setTimeout(() => setCopiedSession(false), 1500)
  }

  const handleCopyInviteCode = () => {
    if (!membership.groups?.invite_code) return
    navigator.clipboard.writeText(membership.groups.invite_code)
    setCopiedInvite(true)
    setTimeout(() => setCopiedInvite(false), 1500)
  }

  const handleShareInvite = async () => {
    if (!canShare) return
    try {
      await navigator.share({
        title: 'Poker Range — Rejoins mon groupe',
        text: `Rejoins mon groupe "${membership.groups?.name}" sur Poker Range !\nCode d'invitation : ${membership.groups?.invite_code}`,
      })
    } catch (e) {
      if (e.name !== 'AbortError') console.error('erreur partage:', e)
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

        {activeSession && !mode && !isMaster && (
          <div style={styles.activeSessionBox}>
            <p style={styles.activeSessionLabel}>Session en cours</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={styles.activeSessionCode}>#{activeSession.code}</span>
              <button
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: copiedSession ? '#22c55e' : '#666', fontSize: '16px', padding: '2px', transition: 'color 0.2s' }}
                onClick={handleCopySessionCode}
                title="Copier le code"
              >
                {copiedSession ? '✓' : '📋'}
              </button>
            </div>
            <button
              style={styles.btnPrimary}
              onClick={() => handleJoin(activeSession.code)}
              disabled={loading || !ready}
            >
              {loading ? 'Connexion...' : !ready ? '⏳ Synchronisation...' : 'Rejoindre la session'}
            </button>
          </div>
        )}

        {!mode && (
          <div style={styles.buttons}>
            {isMaster && (
              <button style={styles.btnPrimary} onClick={handleCreate} disabled={loading || !ready}>
                {loading ? 'Création...' : !ready ? '⏳ Synchronisation...' : 'Créer une session'}
              </button>
            )}
            {!activeSession && !isMaster && (
              <button style={styles.btnSecondary} onClick={() => setMode('join')}>
                Rejoindre avec un code
              </button>
            )}
            <button style={styles.btnLibrary} onClick={() => setShowLibrary(true)}>
              📚 Bibliothèque
            </button>
            {isMaster && (
              <button style={styles.btnMembers} onClick={() => setShowMembers(true)}>
                👥 Membres
              </button>
            )}
            {onSwitchGroup && (
              <button style={styles.btnSwitch} onClick={onSwitchGroup}>
                🔄 Changer de groupe
              </button>
            )}
            <button style={styles.btnNewGroup} onClick={() => setShowGroupModal(true)}>
              ➕ Rejoindre / Créer un groupe
            </button>
            {!isMaster && (
              <button style={styles.btnLeave} onClick={() => setShowLeaveConfirm(true)}>
                🚪 Quitter le groupe
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
            <button style={styles.btnPrimary} onClick={() => handleJoin()} disabled={loading || !ready}>
              {loading ? 'Connexion...' : !ready ? '⏳ Synchronisation...' : 'Rejoindre'}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={styles.inviteCode}>{membership.groups.invite_code}</span>
              <button
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: copiedInvite ? '#22c55e' : '#666', fontSize: '16px', padding: '2px', transition: 'color 0.2s' }}
                onClick={handleCopyInviteCode}
                title="Copier le code d'invitation"
              >
                {copiedInvite ? '✓' : '📋'}
              </button>
              {canShare && (
                <button
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#666', fontSize: '16px', padding: '2px' }}
                  onClick={handleShareInvite}
                  title="Partager le code d'invitation"
                >
                  📤
                </button>
              )}
            </div>
          </div>
        )}

        <button style={styles.logoutBtn} onClick={onLogout}>
          Se déconnecter
        </button>
      </div>

      {showLeaveConfirm && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>🚪 Quitter le groupe</h3>
            <p style={styles.modalText}>
              Tu vas quitter <strong style={{ color: 'white' }}>{membership.groups?.name}</strong>.
              Tes ranges personnelles seront supprimées. Tu pourras rejoindre à nouveau avec le code d'invitation.
            </p>
            <button style={styles.btnDanger} onClick={handleLeaveGroup}>Confirmer</button>
            <button style={styles.btnSecondary} onClick={() => setShowLeaveConfirm(false)}>Annuler</button>
          </div>
        </div>
      )}

      {showGroupModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <h3 style={styles.modalTitle}>Groupe</h3>
              <button style={styles.closeBtn} onClick={() => setShowGroupModal(false)}>✕</button>
            </div>
            <GroupPage
              user={authUser}
              onGroupJoined={() => {
                setShowGroupModal(false)
                if (onSwitchGroup) onSwitchGroup()
              }}
              inline
            />
          </div>
        </div>
      )}

      {showLibrary && (
        <LibraryPage membership={membership} onClose={() => setShowLibrary(false)} onUseRange={null} />
      )}

      {showMembers && (
        <MembersPage membership={membership} onClose={() => setShowMembers(false)} />
      )}
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
  btnLibrary: { padding: '12px', borderRadius: '8px', border: '1px solid #8b5cf6', backgroundColor: 'transparent', color: '#8b5cf6', fontSize: '14px', cursor: 'pointer', width: '100%' },
  btnMembers: { padding: '12px', borderRadius: '8px', border: '1px solid #f59e0b', backgroundColor: 'transparent', color: '#f59e0b', fontSize: '14px', cursor: 'pointer', width: '100%' },
  btnSwitch: { padding: '12px', borderRadius: '8px', border: '1px solid #38bdf8', backgroundColor: 'transparent', color: '#38bdf8', fontSize: '14px', cursor: 'pointer', width: '100%' },
  btnNewGroup: { padding: '12px', borderRadius: '8px', border: '1px solid #22c55e', backgroundColor: 'transparent', color: '#22c55e', fontSize: '14px', cursor: 'pointer', width: '100%' },
  btnLeave: { padding: '12px', borderRadius: '8px', border: '1px solid #ef4444', backgroundColor: 'transparent', color: '#ef4444', fontSize: '14px', cursor: 'pointer', width: '100%' },
  btnDanger: { padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: '#ef4444', color: 'white', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', width: '100%' },
  activeSessionBox: { width: '100%', backgroundColor: '#1a1a1a', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', border: '1px solid #22c55e' },
  activeSessionLabel: { color: '#666', fontSize: '11px', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' },
  activeSessionCode: { color: '#22c55e', fontSize: '20px', fontWeight: 'bold', letterSpacing: '0.1em' },
  inviteBox: { width: '100%', backgroundColor: '#1a1a1a', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' },
  inviteLabel: { color: '#666', fontSize: '11px', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' },
  inviteCode: { color: '#f59e0b', fontSize: '20px', fontWeight: 'bold', letterSpacing: '0.1em' },
  logoutBtn: { padding: '8px', borderRadius: '8px', border: 'none', backgroundColor: 'transparent', color: '#444', fontSize: '12px', cursor: 'pointer', marginTop: '8px' },
  modalOverlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: '16px' },
  modal: { backgroundColor: '#111', border: '1px solid #222', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '360px', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' },
  modalTitle: { color: 'white', fontSize: '16px', margin: 0 },
  modalText: { color: '#888', fontSize: '13px', margin: 0, textAlign: 'center', lineHeight: '1.5' },
  closeBtn: { background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '18px' },
  error: { color: '#ef4444', fontSize: '13px', margin: 0 },
}