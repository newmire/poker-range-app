/**
 * LobbyPage.jsx — Page d'accueil après connexion au groupe
 *
 * Affiche :
 * - Les infos du groupe et du membre connecté
 * - La session active du groupe (détectée automatiquement via Realtime)
 * - Les boutons pour créer/rejoindre une session (selon le rôle)
 * - L'accès à la bibliothèque de ranges et à la gestion des membres
 * - Bouton "Changer de groupe" si l'utilisateur appartient à plusieurs groupes
 * - Bouton "Rejoindre / Créer un groupe" pour rejoindre un nouveau groupe
 * - Bouton "Quitter le groupe" pour les joueurs (pas le master)
 * - Copier le code de session en un clic (bouton 📋)
 * - Copier le code d'invitation du groupe en un clic
 * - Partage natif mobile du code d'invitation (bouton 📤)
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
import LibraryPage from './LibraryPage'
import MembersPage from './MembersPage'
import GroupPage from './GroupPage'

export default function LobbyPage({ membership, onJoined, onLogout, onSwitchGroup, onLeaveGroup, authUser }) {
  const [mode, setMode] = useState(null)
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [activeSession, setActiveSession] = useState(null)
  const [showLibrary, setShowLibrary] = useState(false)
  const [showMembers, setShowMembers] = useState(false)
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [copiedSession, setCopiedSession] = useState(false)
  const [copiedInvite, setCopiedInvite] = useState(false)

  // Vérifie si le partage natif est disponible (mobile uniquement)
  const canShare = typeof navigator !== 'undefined' && !!navigator.share

  const username = membership.username
  const groupId = membership.group_id
  const isMaster = membership.role === 'master'

  // ─── Heartbeat ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!membership?.id) return
    updateLastSeen(membership.id)
    const interval = setInterval(() => updateLastSeen(membership.id), 30000)
    return () => clearInterval(interval)
  }, [membership])

  // ─── Détection automatique de la session active ───────────────────────────
  useEffect(() => {
    if (!groupId) return
    getActiveSession(groupId).then(setActiveSession)
    const sub = subscribeToGroupSessions(groupId, () => {
      getActiveSession(groupId).then(setActiveSession)
    })
    return () => sub.unsubscribe()
  }, [groupId])

  /**
   * Wrapper qui rejette une promesse si elle prend plus de `ms` millisecondes.
   * Évite les hangs infinis sur mobile où les appels Supabase peuvent être lents
   * après un refresh de page (latence réseau + reconnexion interne du SDK).
   */
  const withTimeout = (promise, ms, message) => Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms)),
  ])

  /**
   * Crée une nouvelle session (master uniquement).
   * Timeout à 60s : les 4 appels DB de createSession peuvent être très lents
   * sur mobile après un refresh (latence Supabase + reconnexion SDK).
   */
  const handleCreate = async () => {
    setLoading(true)
    setError(null)
    try {
      const { session, player } = await withTimeout(
        createSession(username, {}, groupId),
        60000,
        'La création a pris trop de temps. Vérifiez votre connexion et réessayez.'
      )
      onJoined({ session, player })
    } catch (e) {
      setError(e.message || 'Une erreur est survenue, réessayez.')
    } finally {
      setLoading(false)
    }
  }

  /**
   * Rejoint une session via son code.
   * Si sessionCode est fourni, l'utilise directement (session active détectée).
   * Sinon, utilise le code saisi manuellement.
   */
  const handleJoin = async (sessionCode) => {
    setLoading(true)
    setError(null)
    try {
      const { session, player } = await withTimeout(
        joinSession(sessionCode ?? code.trim(), username),
        60000,
        'La connexion a pris trop de temps. Vérifiez votre connexion et réessayez.'
      )
      onJoined({ session, player })
    } catch (e) {
      setError(e.message || 'Session introuvable ou erreur réseau.')
    } finally {
      setLoading(false)
    }
  }

  /**
   * Quitte le groupe après confirmation.
   * Supprime le membership de l'utilisateur et remonte l'événement à App.jsx.
   */
  const handleLeaveGroup = async () => {
    await leaveGroup(membership.id)
    setShowLeaveConfirm(false)
    onLeaveGroup()
  }

  /** Copie le code de session dans le presse-papier */
  const handleCopySessionCode = () => {
    if (!activeSession?.code) return
    navigator.clipboard.writeText(activeSession.code)
    setCopiedSession(true)
    setTimeout(() => setCopiedSession(false), 1500)
  }

  /** Copie le code d'invitation du groupe dans le presse-papier */
  const handleCopyInviteCode = () => {
    if (!membership.groups?.invite_code) return
    navigator.clipboard.writeText(membership.groups.invite_code)
    setCopiedInvite(true)
    setTimeout(() => setCopiedInvite(false), 1500)
  }

  /**
   * Partage natif mobile du code d'invitation.
   * Ouvre le menu de partage système (WhatsApp, SMS, etc.)
   * Disponible uniquement sur mobile via navigator.share().
   */
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

        {/* Infos du groupe et du membre */}
        <div style={styles.groupInfo}>
          <span style={styles.groupName}>👥 {membership.groups?.name}</span>
          <span style={styles.username}>{username}</span>
          {isMaster && <span style={styles.masterBadge}>👑 Master</span>}
        </div>

        {/* Session active détectée automatiquement (joueurs uniquement) */}
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
              disabled={loading}
            >
              {loading ? 'Connexion...' : 'Rejoindre la session'}
            </button>
          </div>
        )}

        {/* Boutons principaux */}
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

        {/* Formulaire de saisie manuelle du code */}
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

        {/* Code d'invitation avec copier + partage natif */}
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

      {/* ─── Modal confirmation quitter le groupe ── */}
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

      {/* ─── Modal rejoindre / créer un groupe ── */}
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