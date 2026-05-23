import { useState, useEffect } from 'react'
import LobbyPage from './pages/LobbyPage'
import DashboardPage from './pages/DashboardPage'
import { supabase } from './lib/supabase'
import { useRangeStore } from './stores/rangeStore'

export default function App() {
  const [session, setSession] = useState(null)
  const [player, setPlayer] = useState(null)
  const [loading, setLoading] = useState(true)
  const reset = useRangeStore((state) => state.reset)

  useEffect(() => {
    const tryReconnect = async () => {
      const saved = localStorage.getItem('poker_session')
      if (!saved) return setLoading(false)

      const { playerId, sessionId } = JSON.parse(saved)

      try {
        const { data: playerData, error: playerError } = await supabase
          .from('players')
          .select()
          .eq('id', playerId)
          .single()

        if (playerError || !playerData) {
          localStorage.removeItem('poker_session')
          return setLoading(false)
        }

        if (playerData.session_id !== sessionId) {
          localStorage.removeItem('poker_session')
          return setLoading(false)
        }

        const { data: sessionData, error: sessionError } = await supabase
          .from('sessions')
          .select()
          .eq('id', sessionId)
          .single()

        if (sessionError || !sessionData) {
          localStorage.removeItem('poker_session')
          return setLoading(false)
        }

        setPlayer(playerData)
        setSession(sessionData)

        const { setPlayerId, setMatrix, setPositionSilent, setStackSizeSilent, setVersusSilent } = useRangeStore.getState()
        setPlayerId(playerData.id)

        const versus = playerData.context?.versus ?? 'reg'
        const range = versus === 'fish' ? playerData.range_fish : playerData.range_reg
        if (range?.length > 0) setMatrix(range)
        if (playerData.context?.position) setPositionSilent(playerData.context.position)
        if (playerData.context?.stackSize) setStackSizeSilent(playerData.context.stackSize)
        setVersusSilent(versus)

      } catch (e) {
        localStorage.removeItem('poker_session')
      } finally {
        setLoading(false)
      }
    }

    tryReconnect()
  }, [])

  const handleJoined = ({ session, player }) => {
    localStorage.setItem('poker_session', JSON.stringify({
      playerId: player.id,
      sessionId: session.id,
    }))

    const { setPlayerId, setVersusSilent } = useRangeStore.getState()
    setPlayerId(player.id)
    setVersusSilent('reg')

    setSession(session)
    setPlayer(player)
  }

  const handleLeave = () => {
    localStorage.removeItem('poker_session')
    reset()
    setSession(null)
    setPlayer(null)
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#0a0a0a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#666',
        fontSize: '14px',
      }}>
        Reconnexion...
      </div>
    )
  }

  if (!session) {
    return <LobbyPage onJoined={handleJoined} />
  }

  return <DashboardPage session={session} player={player} onLeave={handleLeave} />
}