/**
 * DashboardPage.jsx — Page principale de la session live
 *
 * Gère :
 * - L'affichage de la grille de range (reg/fish)
 * - La liste des joueurs (master : navigation + broadcast / joueurs : lecture)
 * - Le broadcast de la vue du master vers tous les joueurs via Realtime
 * - La sauvegarde des ranges et du contexte
 * - La modal de confirmation avant de quitter la session
 * - Le marquage is_active=false à la sortie (trigger DB supprime la session si vide)
 * - Indicateur Realtime (point vert/rouge) pour indiquer l'état de la connexion
 * - Spinner + flash vert sur le bouton Sauvegarder
 * - Nombre d'utilisateurs connectés dans la liste joueurs
 * - Toast notification quand un joueur rejoint (master uniquement)
 */

import { useEffect, useState, useRef } from 'react'
import RangeGrid from '../components/RangeGrid/RangeGrid'
import BottomActionBar from '../components/Layout/BottomActionBar'
import { useRangeStore } from '../stores/rangeStore'
import { generateMatrix } from '../components/RangeGrid/rangeMatrix'
import { supabase } from '../lib/supabase'
import LibraryPage from './LibraryPage'
import MembersPage from './MembersPage'
import {
  getPlayers,
  setActivePlayer,
  subscribeToPlayers,
  subscribeToSession,
  saveRange,
  saveContext,
  saveRangeToLibrary,
  updateLastSeen,
  getMembers,
  leaveSession,
} from '../lib/session'

const POSITIONS = ['UTG', 'UTG+1', 'UTG+2', 'MP', 'HJ', 'CO', 'BTN', 'SB', 'BB']

const isMasterFn = (session, player) => session?.master_id === player?.id

/**
 * Retourne la couleur de statut d'un membre selon son last_seen.
 * Vert < 1min, Orange < 5min, Gris sinon.
 */
function getStatus(lastSeen) {
  if (!lastSeen) return { color: '#444' }
  const normalized = lastSeen.endsWith('Z') ? lastSeen : lastSeen + 'Z'
  const diff = Date.now() - new Date(normalized).getTime()
  if (diff < 60000) return { color: '#22c55e' }
  if (diff < 300000) return { color: '#f59e0b' }
  return { color: '#444' }
}

function EyeOpen({ color = '#22c55e' }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )
}

function EyeClosed({ color = '#444' }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
}

function Spinner() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ animation: 'spin 0.8s linear infinite' }}>
      <circle cx="12" cy="12" r="10" strokeOpacity="0.3"/>
      <path d="M12 2a10 10 0 0 1 10 10"/>
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </svg>
  )
}

/**
 * Toast notification — affiché en bas à droite pendant 3 secondes.
 */
function Toast({ message }) {
  return (
    <div style={{
      position: 'fixed',
      bottom: '80px',
      right: '16px',
      backgroundColor: '#1a1a1a',
      border: '1px solid #22c55e',
      borderRadius: '10px',
      padding: '10px 16px',
      color: '#22c55e',
      fontSize: '13px',
      zIndex: 500,
      boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
      animation: 'fadeInUp 0.2s ease',
    }}>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      {message}
    </div>
  )
}

export default function DashboardPage({ session, player, membership, authUser, onLeave, onLogout }) {
  const clearMatrix = useRangeStore((state) => state.clearMatrix)
  const setPlayerId = useRangeStore((state) => state.setPlayerId)
  const setActivePlayerIdInStore = useRangeStore((state) => state.setActivePlayerId)
  const setMatrix = useRangeStore((state) => state.setMatrix)
  const position = useRangeStore((state) => state.position)
  const stackSize = useRangeStore((state) => state.stackSize)
  const versus = useRangeStore((state) => state.versus)
  const setPosition = useRangeStore((state) => state.setPosition)
  const setStackSize = useRangeStore((state) => state.setStackSize)
  const setPositionSilent = useRangeStore((state) => state.setPositionSilent)
  const setStackSizeSilent = useRangeStore((state) => state.setStackSizeSilent)
  const setVersusSilent = useRangeStore((state) => state.setVersusSilent)

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [players, setPlayers] = useState([])
  const [members, setMembers] = useState([])
  const [isConnected, setIsConnected] = useState(true)
  const [localViewedId, setLocalViewedId] = useState(player?.id ?? null)
  const [localViewedPlayer, setLocalViewedPlayer] = useState(null)
  const [broadcastedId, setBroadcastedId] = useState(null)
  const [viewedPlayerId, setViewedPlayerId] = useState(null)
  const [activeGrid, setActiveGrid] = useState('reg')
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [showLibrary, setShowLibrary] = useState(false)
  const [showMembers, setShowMembers] = useState(false)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [saveShared, setSaveShared] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Toast notification
  const [toast, setToast] = useState(null)
  const toastTimeout = useRef(null)

  const master = isMasterFn(session, player)

  /**
   * Affiche un toast pendant 3 secondes puis le cache.
   */
  const showToast = (message) => {
    if (toastTimeout.current) clearTimeout(toastTimeout.current)
    setToast(message)
    toastTimeout.current = setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    return () => {
      if (toastTimeout.current) clearTimeout(toastTimeout.current)
    }
  }, [])

  useEffect(() => {
    if (!membership?.id) return
    updateLastSeen(membership.id)
    const interval = setInterval(() => updateLastSeen(membership.id), 30000)
    return () => clearInterval(interval)
  }, [membership])

  useEffect(() => {
    if (!membership?.group_id || !master) return
    getMembers(membership.group_id).then(setMembers)
    const interval = setInterval(() => {
      getMembers(membership.group_id).then(setMembers)
    }, 30000)
    return () => clearInterval(interval)
  }, [membership, master])

  useEffect(() => {
    if (player?.id) setPlayerId(player.id)
  }, [player])

  useEffect(() => {
    if (!session) return
    getPlayers(session.id).then((p) => {
      setPlayers(p)
      const current = p.find((pl) => pl.id === player.id)
      if (current) {
        setLocalViewedPlayer(current)
        setLocalViewedId(current.id)
        setActivePlayerIdInStore(current.id)
      }
    })
  }, [session])

  // ─── Realtime joueurs + toast ────────────────────────────────────────────────
  // Détecte les nouveaux joueurs et affiche un toast côté master
  const playersRef = useRef([])
  useEffect(() => {
    if (!session) return
    const sub = subscribeToPlayers(session.id, (payload) => {
      getPlayers(session.id).then((updatedPlayers) => {
        // Détecte un nouveau joueur (INSERT) côté master
        if (master && payload.eventType === 'INSERT' && payload.new?.id !== player.id) {
          showToast(`🎮 ${payload.new.name} a rejoint la session`)
        }
        setPlayers(updatedPlayers)
        playersRef.current = updatedPlayers
        if (master && payload.new?.id === localViewedId) {
          const updated = updatedPlayers.find((p) => p.id === payload.new.id)
          if (updated) {
            setLocalViewedPlayer(updated)
            const v = updated?.context?.versus ?? 'reg'
            const range = v === 'fish' ? updated.range_fish : updated.range_reg
            if (range?.length > 0) setMatrix(range)
            if (updated?.context?.position) setPositionSilent(updated.context.position)
            if (updated?.context?.stackSize) setStackSizeSilent(updated.context.stackSize)
            setVersusSilent(v)
          }
        }
      })
    })
    return () => sub.unsubscribe()
  }, [session, master, localViewedId])

  useEffect(() => {
    if (!session) return
    const sub = subscribeToSession(session.id, (payload) => {
      const newActiveId = payload.new.active_player_id
      setBroadcastedId(newActiveId)
      if (!master) {
        if (newActiveId) {
          const activePlayer = players.find((p) => p.id === newActiveId)
          if (activePlayer?.range_reg) setMatrix(activePlayer.range_reg)
          setViewedPlayerId(null)
        } else {
          const self = players.find((p) => p.id === player.id)
          if (self?.range_reg) setMatrix(self.range_reg)
          setViewedPlayerId(null)
        }
      }
    })
    return () => sub.unsubscribe()
  }, [session, player, players, master])

  useEffect(() => {
    if (!session) return
    const channel = supabase
      .channel(`realtime-status:${session.id}`)
      .on('system', {}, (status) => {
        if (status.extension === 'postgres_changes') {
          setIsConnected(status.status === 'ok')
        }
      })
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED')
      })
    return () => channel.unsubscribe()
  }, [session])

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const getMemberStatus = (playerName) => {
    const member = members.find((m) => m.username === playerName)
    return member ? getStatus(member.last_seen) : { color: '#444' }
  }

  const handleSelectPlayer = async (p) => {
    const { matrix, activePlayerId } = useRangeStore.getState()
    if (activePlayerId) await saveRange(activePlayerId, matrix, activeGrid)
    setActivePlayerIdInStore(p.id)
    setLocalViewedId(p.id)
    setLocalViewedPlayer(p)
    const v = p.context?.versus ?? 'reg'
    const range = v === 'fish' ? p.range_fish : p.range_reg
    if (range?.length > 0) { setMatrix(range) } else { clearMatrix() }
    if (p.context?.position) setPositionSilent(p.context.position)
    if (p.context?.stackSize) setStackSizeSilent(p.context.stackSize)
    setVersusSilent(v)
    setActiveGrid(v)
  }

  const handleBroadcast = async (p) => {
    if (broadcastedId === p.id) {
      await setActivePlayer(session.id, null)
      setBroadcastedId(null)
    } else {
      await setActivePlayer(session.id, p.id)
      setBroadcastedId(p.id)
    }
  }

  const handleSelectGrid = async (gridVersus) => {
    if (gridVersus === activeGrid) return
    const { matrix, activePlayerId } = useRangeStore.getState()
    await saveRange(activePlayerId, matrix, activeGrid)
    const updated = await getPlayers(session.id)
    setPlayers(updated)
    const freshPlayer = updated.find((p) => p.id === localViewedId)
    if (freshPlayer) setLocalViewedPlayer(freshPlayer)
    const range = gridVersus === 'fish'
      ? (freshPlayer?.range_fish?.length > 0 ? freshPlayer.range_fish : generateMatrix())
      : (freshPlayer?.range_reg?.length > 0 ? freshPlayer.range_reg : generateMatrix())
    setMatrix(range)
    setVersusSilent(gridVersus)
    setActiveGrid(gridVersus)
    if (activePlayerId) saveContext(activePlayerId, { position, stackSize, versus: gridVersus })
  }

  const handleSaveToLibrary = async () => {
    if (!saveName.trim()) return
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { matrix } = useRangeStore.getState()
      await saveRangeToLibrary({
        userId: user.id,
        groupId: membership.group_id,
        name: saveName.trim(),
        context: { position, stackSize, versus },
        range: matrix,
        isShared: saveShared,
      })
      setShowSaveModal(false)
      setSaveName('')
      setSaveShared(false)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 1500)
    } catch (e) {
      console.error('erreur save:', e)
    } finally {
      setSaving(false)
    }
  }

  const handleUseRange = (range) => {
    if (range.range?.length > 0) setMatrix(range.range)
    if (range.context?.position) setPositionSilent(range.context.position)
    if (range.context?.stackSize) setStackSizeSilent(range.context.stackSize)
    if (range.context?.versus) {
      setVersusSilent(range.context.versus)
      setActiveGrid(range.context.versus)
    }
    setShowLibrary(false)
  }

  const handleConfirmLeave = async () => {
    const { matrix, activePlayerId } = useRangeStore.getState()
    if (activePlayerId) await saveRange(activePlayerId, matrix, activeGrid)
    await leaveSession(player.id)
    setShowLeaveConfirm(false)
    onLeave()
  }

  const handleViewPlayer = (p) => {
    if (p.id === viewedPlayerId) {
      setViewedPlayerId(null)
      const self = players.find((pl) => pl.id === player.id)
      if (self?.range_reg) setMatrix(self.range_reg)
      return
    }
    setViewedPlayerId(p.id)
    const range = p.range_reg
    if (range?.length > 0) setMatrix(range)
  }

  const sortedPlayers = [
    ...players.filter((p) => p.id === player.id),
    ...players.filter((p) => p.id !== player.id),
  ]

  const showBothGrids = master && !isMobile

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0a0a0a',
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      alignItems: isMobile ? 'center' : 'flex-start',
      padding: '16px',
      paddingBottom: '80px',
      gap: '20px',
    }}>

      {/* ── Panneau latéral ── */}
      <div style={{
        width: isMobile ? '100%' : '180px',
        flexShrink: 0,
        backgroundColor: '#111',
        padding: '12px',
        borderRadius: '12px',
        border: '1px solid #222',
        display: 'flex',
        flexDirection: isMobile ? 'row' : 'column',
        flexWrap: 'wrap',
        gap: '8px',
      }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <h3 style={styles.title}>{master ? '👑 Master' : '🎮 Joueur'}</h3>
          <button style={styles.leaveBtnSmall} onClick={() => setShowLeaveConfirm(true)}>✕</button>
        </div>

        {session && (
          <div style={styles.sessionInfo}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={styles.sessionCode}>#{session.code}</span>
              <span
                title={isConnected ? 'Connecté' : 'Déconnecté — mises à jour suspendues'}
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor: isConnected ? '#22c55e' : '#ef4444',
                  flexShrink: 0,
                  cursor: 'default',
                }}
              />
            </div>
            <span style={styles.playerName}>{player?.name}</span>
          </div>
        )}

        <button style={styles.button} onClick={clearMatrix}>Clear</button>

        <button
          style={{
            ...styles.saveBtn,
            backgroundColor: saveSuccess ? '#22c55e22' : 'transparent',
            borderColor: saveSuccess ? '#22c55e' : '#3b82f6',
            color: saveSuccess ? '#22c55e' : '#3b82f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition: 'all 0.3s',
          }}
          onClick={() => setShowSaveModal(true)}
          disabled={saving}
        >
          {saving ? <Spinner /> : saveSuccess ? '✓' : '💾'}
          {saving ? 'Sauvegarde...' : saveSuccess ? 'Sauvegardé !' : 'Sauvegarder'}
        </button>

        <button style={styles.libraryBtn} onClick={() => setShowLibrary(true)}>📚 Bibliothèque</button>
        {master && (
          <button style={styles.membersBtn} onClick={() => setShowMembers(true)}>👥 Membres</button>
        )}

        <hr style={{ width: '100%', opacity: 0.15, margin: '4px 0' }} />

        <label style={styles.label}>Position</label>
        <select style={styles.select} value={position} onChange={(e) => setPosition(e.target.value)}>
          {POSITIONS.map((pos) => <option key={pos} value={pos}>{pos}</option>)}
        </select>

        <label style={styles.label}>Profondeur (BB)</label>
        <input
          type="text"
          style={styles.input}
          value={stackSize}
          onChange={(e) => setStackSize(e.target.value)}
          placeholder="ex: 100"
        />

        <label style={styles.label}>Versus</label>
        <div style={styles.toggleRow}>
          <button
            style={{
              ...styles.toggleBtn,
              backgroundColor: activeGrid === 'reg' ? '#22c55e' : '#1a1a1a',
              color: activeGrid === 'reg' ? 'white' : '#666',
              border: activeGrid === 'reg' ? 'none' : '1px solid #333',
            }}
            onClick={() => handleSelectGrid('reg')}
          >Reg</button>
          <button
            style={{
              ...styles.toggleBtn,
              backgroundColor: activeGrid === 'fish' ? '#f97316' : '#1a1a1a',
              color: activeGrid === 'fish' ? 'white' : '#666',
              border: activeGrid === 'fish' ? 'none' : '1px solid #333',
            }}
            onClick={() => handleSelectGrid('fish')}
          >Fish</button>
        </div>

        {/* ── Liste joueurs master ── */}
        {master && (
          <div style={styles.playerList}>
            <hr style={{ width: '100%', opacity: 0.15, margin: '4px 0' }} />
            <p style={styles.playerListTitle}>
              Joueurs · <span style={{ color: '#22c55e' }}>
                {sortedPlayers.length} utilisateur{sortedPlayers.length > 1 ? 's' : ''}
              </span>
            </p>
            {sortedPlayers.map((p) => {
              const status = getMemberStatus(p.name)
              const isLocalViewed = localViewedId === p.id
              const isBroadcasted = broadcastedId === p.id
              return (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: `1px solid ${isLocalViewed ? '#22c55e' : '#2a2a2a'}`,
                    backgroundColor: '#1a1a1a',
                    cursor: 'pointer',
                  }}
                  onClick={() => handleSelectPlayer(p)}
                >
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: status.color, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: '13px', color: isLocalViewed ? '#22c55e' : '#ccc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.id === player.id ? `${p.name} (moi)` : p.name}
                  </span>
                  <button
                    style={{ background: 'transparent', border: 'none', padding: '2px', cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0 }}
                    onClick={(e) => { e.stopPropagation(); handleBroadcast(p) }}
                    title={isBroadcasted ? 'Stopper le broadcast' : 'Imposer cette vue à tous'}
                  >
                    {isBroadcasted ? <EyeOpen color="#22c55e" /> : <EyeClosed color="#444" />}
                  </button>
                </div>
              )
            })}
            {sortedPlayers.length === 0 && <p style={styles.noPlayers}>En attente de joueurs...</p>}
          </div>
        )}

        {/* ── Liste joueurs non-master ── */}
        {!master && players.length > 0 && (
          <div style={styles.playerList}>
            <hr style={{ width: '100%', opacity: 0.15, margin: '4px 0' }} />
            <p style={styles.playerListTitle}>
              Connectés · <span style={{ color: '#22c55e' }}>
                {sortedPlayers.length} utilisateur{sortedPlayers.length > 1 ? 's' : ''}
              </span>
            </p>
            {sortedPlayers.map((p) => {
              const isMe = p.id === player.id
              const isViewed = viewedPlayerId === p.id
              const isBroadcasted = broadcastedId === p.id
              return (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: `1px solid ${isViewed ? '#3b82f6' : '#2a2a2a'}`,
                    backgroundColor: '#1a1a1a',
                    cursor: isMe ? 'default' : 'pointer',
                  }}
                  onClick={isMe ? undefined : () => handleViewPlayer(p)}
                >
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: isMe ? '#22c55e' : '#444', flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: '13px', color: isViewed ? '#3b82f6' : isMe ? '#22c55e' : '#ccc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {isMe ? `${p.name} (moi)` : p.name}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                    {isBroadcasted ? <EyeOpen color="#22c55e" /> : <EyeClosed color="#333" />}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Zone grille ── */}
      {showBothGrids ? (
        <div style={{ display: 'flex', gap: '16px', flex: 1, alignItems: 'flex-start' }}>
          <div
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
            onClick={() => handleSelectGrid('reg')}
          >
            <span style={{ ...styles.gridLabel, color: activeGrid === 'reg' ? '#22c55e' : '#aaa' }}>🟢 Reg</span>
            <div style={{ borderRadius: '14px', border: activeGrid === 'reg' ? '2px solid #22c55e' : '2px solid transparent', transition: '0.15s' }}>
              <RangeGrid overrideMatrix={activeGrid === 'reg' ? undefined : (localViewedPlayer?.range_reg ?? undefined)} readOnly={activeGrid !== 'reg'} />
            </div>
          </div>
          <div
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
            onClick={() => handleSelectGrid('fish')}
          >
            <span style={{ ...styles.gridLabel, color: activeGrid === 'fish' ? '#f97316' : '#aaa' }}>🟠 Fish</span>
            <div style={{ borderRadius: '14px', border: activeGrid === 'fish' ? '2px solid #f97316' : '2px solid transparent', transition: '0.15s' }}>
              <RangeGrid overrideMatrix={activeGrid === 'fish' ? undefined : (localViewedPlayer?.range_fish ?? undefined)} readOnly={activeGrid !== 'fish'} />
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          {viewedPlayerId && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#3b82f6', fontSize: '13px' }}>
                👁️ Range de {players.find(p => p.id === viewedPlayerId)?.name}
              </span>
              <button
                style={{ background: 'transparent', border: '1px solid #333', borderRadius: '6px', color: '#666', fontSize: '11px', padding: '3px 8px', cursor: 'pointer' }}
                onClick={() => handleViewPlayer(players.find(p => p.id === viewedPlayerId))}
              >
                Retour
              </button>
            </div>
          )}
          <RangeGrid readOnly={!!viewedPlayerId} />
        </div>
      )}

      <BottomActionBar />

      {/* ── Toast notification ── */}
      {toast && <Toast message={toast} />}

      {/* ── Modal confirmation quitter ── */}
      {showLeaveConfirm && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>Quitter la session ?</h3>
            <p style={styles.modalContext}>
              Ta range sera sauvegardée. Tu pourras rejoindre si la session est encore active.
            </p>
            <button style={styles.btnPrimary} onClick={handleConfirmLeave}>Quitter</button>
            <button style={styles.btnSecondary} onClick={() => setShowLeaveConfirm(false)}>Annuler</button>
          </div>
        </div>
      )}

      {/* ── Modal sauvegarde range ── */}
      {showSaveModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>💾 Sauvegarder la range</h3>
            <p style={styles.modalContext}>{position} · {stackSize}BB · {versus === 'reg' ? 'Reg' : 'Fish'}</p>
            <input
              type="text"
              style={styles.input}
              placeholder="Nom de la range (ex: BTN open 100bb)"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              autoFocus
            />
            <div style={styles.toggleRow}>
              <button
                style={{ ...styles.toggleBtn, backgroundColor: !saveShared ? '#22c55e' : '#1a1a1a', color: !saveShared ? 'white' : '#666', border: !saveShared ? 'none' : '1px solid #333' }}
                onClick={() => setSaveShared(false)}
              >Personnelle</button>
              {membership.role === 'master' && (
                <button
                  style={{ ...styles.toggleBtn, backgroundColor: saveShared ? '#3b82f6' : '#1a1a1a', color: saveShared ? 'white' : '#666', border: saveShared ? 'none' : '1px solid #333' }}
                  onClick={() => setSaveShared(true)}
                >Partagée</button>
              )}
            </div>
            <button style={styles.btnPrimary} onClick={handleSaveToLibrary} disabled={saving}>
              {saving ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
            <button style={styles.btnSecondary} onClick={() => { setShowSaveModal(false); setSaveName('') }}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {showLibrary && (
        <LibraryPage membership={membership} onClose={() => setShowLibrary(false)} onUseRange={handleUseRange} />
      )}

      {showMembers && (
        <MembersPage membership={membership} onClose={() => setShowMembers(false)} />
      )}
    </div>
  )
}

const styles = {
  title: { color: 'white', fontSize: '14px', margin: 0 },
  sessionInfo: { display: 'flex', flexDirection: 'column', gap: '2px', width: '100%', marginBottom: '4px' },
  sessionCode: { color: '#22c55e', fontSize: '13px', fontWeight: 'bold' },
  playerName: { color: '#888', fontSize: '12px' },
  button: { padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: '#222', color: 'white', cursor: 'pointer', fontSize: '12px', flex: '1 1 auto' },
  saveBtn: { padding: '10px', borderRadius: '8px', border: '1px solid #3b82f6', backgroundColor: 'transparent', color: '#3b82f6', cursor: 'pointer', fontSize: '12px', flex: '1 1 auto' },
  libraryBtn: { padding: '10px', borderRadius: '8px', border: '1px solid #8b5cf6', backgroundColor: 'transparent', color: '#8b5cf6', cursor: 'pointer', fontSize: '12px', flex: '1 1 auto' },
  membersBtn: { padding: '10px', borderRadius: '8px', border: '1px solid #f59e0b', backgroundColor: 'transparent', color: '#f59e0b', cursor: 'pointer', fontSize: '12px', flex: '1 1 auto' },
  leaveBtnSmall: { background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '16px', padding: '2px 6px', lineHeight: 1 },
  label: { color: '#666', fontSize: '11px', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' },
  select: { padding: '10px', borderRadius: '8px', border: '1px solid #333', backgroundColor: '#1a1a1a', color: 'white', fontSize: '13px', width: '100%', cursor: 'pointer', outline: 'none' },
  input: { padding: '10px', borderRadius: '8px', border: '1px solid #333', backgroundColor: '#1a1a1a', color: 'white', fontSize: '13px', width: '100%', boxSizing: 'border-box', outline: 'none' },
  toggleRow: { display: 'flex', gap: '6px', width: '100%' },
  toggleBtn: { flex: 1, padding: '10px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', transition: '0.15s' },
  playerList: { display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' },
  playerListTitle: { color: '#666', fontSize: '11px', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' },
  playerBtn: { padding: '10px', borderRadius: '8px', border: '1px solid #333', backgroundColor: '#1a1a1a', color: '#ccc', cursor: 'pointer', fontSize: '13px', textAlign: 'left', transition: '0.15s' },
  noPlayers: { color: '#444', fontSize: '12px', margin: 0, fontStyle: 'italic' },
  gridLabel: { color: '#aaa', fontSize: '13px', fontWeight: 'bold' },
  modalOverlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 },
  modal: { backgroundColor: '#111', border: '1px solid #222', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '320px', display: 'flex', flexDirection: 'column', gap: '12px' },
  modalTitle: { color: 'white', fontSize: '16px', margin: 0 },
  modalContext: { color: '#666', fontSize: '12px', margin: 0 },
  btnPrimary: { padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: '#22c55e', color: 'white', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', width: '100%' },
  btnSecondary: { padding: '12px', borderRadius: '8px', border: '1px solid #333', backgroundColor: 'transparent', color: '#aaa', fontSize: '14px', cursor: 'pointer', width: '100%' },
}