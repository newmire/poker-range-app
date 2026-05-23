import { useEffect, useState } from 'react'
import RangeGrid from '../components/RangeGrid/RangeGrid'
import BottomActionBar from '../components/Layout/BottomActionBar'
import { useRangeStore } from '../stores/rangeStore'
import { generateMatrix } from '../components/RangeGrid/rangeMatrix'
import {
  getPlayers,
  setActivePlayer,
  subscribeToPlayers,
  subscribeToSession,
  saveRange,
  saveContext,
} from '../lib/session'

const POSITIONS = ['UTG', 'UTG+1', 'UTG+2', 'MP', 'HJ', 'CO', 'BTN', 'SB', 'BB']

const isMaster = (session, player) => session?.master_id === player?.id

export default function DashboardPage({ session, player, onLeave }) {
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
  const [highlightedPlayerId, setHighlightedPlayerId] = useState(player?.id ?? null)
  const [highlightedPlayer, setHighlightedPlayer] = useState(null)
  const [activeGrid, setActiveGrid] = useState('reg')

  const master = isMaster(session, player)

  useEffect(() => {
    if (player?.id) setPlayerId(player.id)
  }, [player])

  useEffect(() => {
    if (!session) return
    getPlayers(session.id).then((p) => {
      setPlayers(p)
      const current = p.find((pl) => pl.id === player.id)
      if (current) setHighlightedPlayer(current)
    })
  }, [session])

  useEffect(() => {
    if (!session) return
    const sub = subscribeToPlayers(session.id, (payload) => {
      getPlayers(session.id).then((updatedPlayers) => {
        setPlayers(updatedPlayers)

        if (master && payload.new?.id === highlightedPlayerId) {
          const updated = updatedPlayers.find((p) => p.id === payload.new.id)
          if (updated) {
            setHighlightedPlayer(updated)
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
  }, [session, master, highlightedPlayerId])

  useEffect(() => {
    if (!session) return
    const sub = subscribeToSession(session.id, (payload) => {
      const newActiveId = payload.new.active_player_id
      setHighlightedPlayerId(newActiveId)

      if (!master && newActiveId) {
        const activePlayer = players.find((p) => p.id === newActiveId)
        if (activePlayer?.range_reg) setMatrix(activePlayer.range_reg)
      }
    })
    return () => sub.unsubscribe()
  }, [session, player, players])

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleSelectPlayer = async (p) => {
    setActivePlayerIdInStore(p.id)
    setHighlightedPlayerId(p.id)
    setHighlightedPlayer(p)
    await setActivePlayer(session.id, p.id)

    const v = p.context?.versus ?? 'reg'
    const range = v === 'fish' ? p.range_fish : p.range_reg
    if (range?.length > 0) {
      setMatrix(range)
    } else {
      clearMatrix()
    }
    if (p.context?.position) setPositionSilent(p.context.position)
    if (p.context?.stackSize) setStackSizeSilent(p.context.stackSize)
    setVersusSilent(v)
    setActiveGrid(v)
  }

  const handleSelectGrid = async (gridVersus) => {
    if (gridVersus === activeGrid) return

    const { matrix, activePlayerId } = useRangeStore.getState()
    await saveRange(activePlayerId, matrix, activeGrid)

    const updated = await getPlayers(session.id)
    setPlayers(updated)
    const freshPlayer = updated.find((p) => p.id === highlightedPlayerId)
    if (freshPlayer) setHighlightedPlayer(freshPlayer)

    const range = gridVersus === 'fish'
      ? (freshPlayer?.range_fish?.length > 0 ? freshPlayer.range_fish : generateMatrix())
      : (freshPlayer?.range_reg?.length > 0 ? freshPlayer.range_reg : generateMatrix())

    setMatrix(range)
    setVersusSilent(gridVersus)
    setActiveGrid(gridVersus)
    if (activePlayerId) saveContext(activePlayerId, { position, stackSize, versus: gridVersus })
  }

  const sortedPlayers = [
    ...players.filter((p) => p.id === player.id),
    ...players.filter((p) => p.id !== player.id),
  ]

  const showBothGrids = master && !isMobile && highlightedPlayer

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
          <h3 style={styles.title}>
            {master ? '👑 Master' : '🎮 Joueur'}
          </h3>
          <button style={styles.leaveBtnSmall} onClick={onLeave}>✕</button>
        </div>

        {session && (
          <div style={styles.sessionInfo}>
            <span style={styles.sessionCode}>#{session.code}</span>
            <span style={styles.playerName}>{player?.name}</span>
          </div>
        )}

        <button style={styles.button} onClick={clearMatrix}>Clear</button>

        <hr style={{ width: '100%', opacity: 0.15, margin: '4px 0' }} />

        <label style={styles.label}>Position</label>
        <select
          style={styles.select}
          value={position}
          onChange={(e) => setPosition(e.target.value)}
        >
          {POSITIONS.map((pos) => (
            <option key={pos} value={pos}>{pos}</option>
          ))}
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
          >
            Reg
          </button>
          <button
            style={{
              ...styles.toggleBtn,
              backgroundColor: activeGrid === 'fish' ? '#f97316' : '#1a1a1a',
              color: activeGrid === 'fish' ? 'white' : '#666',
              border: activeGrid === 'fish' ? 'none' : '1px solid #333',
            }}
            onClick={() => handleSelectGrid('fish')}
          >
            Fish
          </button>
        </div>

        {master && (
          <div style={styles.playerList}>
            <hr style={{ width: '100%', opacity: 0.15, margin: '4px 0' }} />
            <p style={styles.playerListTitle}>Voir la range de</p>
            {sortedPlayers.map((p) => (
              <button
                key={p.id}
                style={{
                  ...styles.playerBtn,
                  borderColor: highlightedPlayerId === p.id ? '#22c55e' : '#333',
                  color: highlightedPlayerId === p.id ? '#22c55e' : '#ccc',
                }}
                onClick={() => handleSelectPlayer(p)}
              >
                {p.id === player.id ? `${p.name} (moi)` : p.name}
              </button>
            ))}
            {sortedPlayers.length === 0 && (
              <p style={styles.noPlayers}>En attente de joueurs...</p>
            )}
          </div>
        )}
      </div>

      {showBothGrids ? (
        <div style={{ display: 'flex', gap: '16px', flex: 1, alignItems: 'flex-start' }}>
          <div
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
            onClick={() => handleSelectGrid('reg')}
          >
            <span style={{ ...styles.gridLabel, color: activeGrid === 'reg' ? '#22c55e' : '#aaa' }}>🟢 Reg</span>
            <div style={{
              borderRadius: '14px',
              border: activeGrid === 'reg' ? '2px solid #22c55e' : '2px solid transparent',
              transition: '0.15s',
            }}>
              <RangeGrid overrideMatrix={activeGrid === 'reg' ? undefined : highlightedPlayer?.range_reg} readOnly={activeGrid !== 'reg'} />
            </div>
          </div>
          <div
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
            onClick={() => handleSelectGrid('fish')}
          >
            <span style={{ ...styles.gridLabel, color: activeGrid === 'fish' ? '#f97316' : '#aaa' }}>🟠 Fish</span>
            <div style={{
              borderRadius: '14px',
              border: activeGrid === 'fish' ? '2px solid #f97316' : '2px solid transparent',
              transition: '0.15s',
            }}>
              <RangeGrid overrideMatrix={activeGrid === 'fish' ? undefined : highlightedPlayer?.range_fish} readOnly={activeGrid !== 'fish'} />
            </div>
          </div>
        </div>
      ) : (
        <RangeGrid />
      )}

      <BottomActionBar />
    </div>
  )
}

const styles = {
  title: { color: 'white', fontSize: '14px', margin: 0 },
  sessionInfo: { display: 'flex', flexDirection: 'column', gap: '2px', width: '100%', marginBottom: '4px' },
  sessionCode: { color: '#22c55e', fontSize: '13px', fontWeight: 'bold' },
  playerName: { color: '#888', fontSize: '12px' },
  button: { padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: '#222', color: 'white', cursor: 'pointer', fontSize: '12px', flex: '1 1 auto' },
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
}