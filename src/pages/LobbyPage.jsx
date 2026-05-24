/**
 * LobbyPage.jsx — Page d'accueil après connexion au groupe
 *
 * Affiche :
 * - Les infos du groupe et du membre connecté
 * - La session active du groupe (détectée automatiquement via Realtime)
 * - Les boutons pour créer/rejoindre une session (selon le rôle)
 * - L'accès à la bibliothèque de ranges et à la gestion des membres
 *
 * Fonctionnalités :
 * - Détection automatique d'une session active via Supabase Realtime
 * - Heartbeat toutes les 30 secondes pour le statut en ligne
 * - Accès à la bibliothèque et aux membres depuis le lobby
 */

import { useState, useEffect } from 'react'
import {
  createSession,
  joinSession,
  getActiveSession,
  subscribeToGroupSessions,
  updateLastSeen,
} from '../lib/session'
import LibraryPage from './LibraryPage'
import MembersPage from './MembersPage'

export default function LobbyPage({ membership, onJoined, onLogout }) {
  const [mode, setMode] = useState(null)               // null | 'join'
  const [code, setCode] = useState('')                 // Code de session saisi manuellement
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [activeSession, setActiveSession] = useState(null) // Session active du groupe
  const [showLibrary, setShowLibrary] = useState(false)
  const [showMembers, setShowMembers] = useState(false)

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
  // Charge la session active au montage puis écoute les nouvelles sessions en Realtime
  useEffect(() => {
    if (!groupId) return
    getActiveSession(groupId).then(setActiveSession)
    const sub = subscribeToGroupSessions(groupId, () => {
      getActiveSession(groupId).then(setActiveSession)
    })
    return () => sub.unsubscribe()
  }, [groupId])

  /**
   * Crée une nouvelle session (master uniquement).
   * Le master devient automatiquement le premier joueur.
   */
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

  /**
   * Rejoint une session via son code.
   * Si sessionCode est fourni, l'utilise directement (session active détectée).
   * Sinon, utilise le code saisi manuellement.
   *
   * @param {string} [sessionCode] - Code de session (optionnel)
   */
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

        {/* Boutons principaux */}
        {!mode && (
          <div style={styles.buttons}>
            {/* Créer une session (master uniquement) */}
            {isMaster && (
              <button style={styles.btnPrimary} onClick={handleCreate} disabled={loading}>
                {loading ? 'Création...' : 'Créer une session'}
              </button>
            )}
            {/* Rejoindre manuellement (joueurs sans session active) */}
            {!activeSession && !isMaster && (
              <button style={styles.btnSecondary} onClick={() => setMode('join')}>
                Rejoindre avec un code
              </button>
            )}
            <button style={styles.btnLibrary} onClick={() => setShowLibrary(true)}>
              📚 Bibliothèque
            </button>
            {/* Gestion des membres (master uniquement) */}
            {isMaster && (
              <button style={styles.btnMembers} onClick={() => setShowMembers(true)}>
                👥 Membres
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

        {/* Code d'invitation du groupe (master uniquement) */}
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

      {/* Bibliothèque de ranges */}
      {showLibrary && (
        <LibraryPage
          membership={membership}
          onClose={() => setShowLibrary(false)}
          onUseRange={null}
        />
      )}

      {/* Page membres */}
      {showMembers && (
        <MembersPage
          membership={membership}
          onClose={() => setShowMembers(false)}
        />
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
  activeSessionBox: { width: '100%', backgroundColor: '#1a1a1a', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', border: '1px solid #22c55e' },
  activeSessionLabel: { color: '#666', fontSize: '11px', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' },
  activeSessionCode: { color: '#22c55e', fontSize: '20px', fontWeight: 'bold', letterSpacing: '0.1em' },
  inviteBox: { width: '100%', backgroundColor: '#1a1a1a', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' },
  inviteLabel: { color: '#666', fontSize: '11px', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' },
  inviteCode: { color: '#f59e0b', fontSize: '20px', fontWeight: 'bold', letterSpacing: '0.1em' },
  logoutBtn: { padding: '8px', borderRadius: '8px', border: 'none', backgroundColor: 'transparent', color: '#444', fontSize: '12px', cursor: 'pointer', marginTop: '8px' },
  error: { color: '#ef4444', fontSize: '13px', margin: 0 },
}