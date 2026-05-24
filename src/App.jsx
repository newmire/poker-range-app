/**
 * App.jsx — Point d'entrée principal de l'application
 */

import { useState, useEffect } from 'react'
import LobbyPage from './pages/LobbyPage'
import DashboardPage from './pages/DashboardPage'
import LoginPage from './pages/LoginPage'
import GroupPage from './pages/GroupPage'
import GroupSelectPage from './pages/GroupSelectPage'
import { supabase } from './lib/supabase'
import { useRangeStore } from './stores/rangeStore'

async function handleAuthSession(authSession, { setAuthUser, setMemberships, setMembership, setPlayer, setSession, setLoading }) {
  setAuthUser(authSession.user)

  const { data: memberData } = await supabase
    .from('memberships')
    .select('*, groups(*)')
    .eq('user_id', authSession.user.id)

  const memberships = memberData ?? []
  setMemberships(memberships)

  if (memberships.length === 1) {
    setMembership(memberships[0])
    await restoreSession(memberships[0], { setPlayer, setSession })
  } else if (memberships.length === 0) {
    setMembership(null)
  }

  setLoading(false)
}

async function restoreSession(membership, { setPlayer, setSession }) {
  const saved = localStorage.getItem('poker_session')
  if (!saved) return

  const { playerId, sessionId } = JSON.parse(saved)

  const { data: playerData } = await supabase
    .from('players')
    .select()
    .eq('id', playerId)
    .single()

  if (playerData && playerData.session_id === sessionId) {
    const { data: sessionData } = await supabase
      .from('sessions')
      .select()
      .eq('id', sessionId)
      .single()

    if (sessionData) {
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
    } else {
      localStorage.removeItem('poker_session')
    }
  } else {
    localStorage.removeItem('poker_session')
  }
}

export default function App() {
  const [authUser, setAuthUser] = useState(null)
  const [memberships, setMemberships] = useState([])
  const [membership, setMembership] = useState(null)
  const [session, setSession] = useState(null)
  const [player, setPlayer] = useState(null)
  const [loading, setLoading] = useState(true)
  const reset = useRangeStore((state) => state.reset)

  useEffect(() => {
    const handlers = { setAuthUser, setMemberships, setMembership, setPlayer, setSession, setLoading }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, authSession) => {
      if (!authSession) {
        setAuthUser(null)
        setMemberships([])
        setMembership(null)
        setLoading(false)
        return
      }
      await handleAuthSession(authSession, handlers)
    })

    return () => subscription.unsubscribe()
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

  const handleLogout = async () => {
    localStorage.removeItem('poker_session')
    reset()
    await supabase.auth.signOut()
    setAuthUser(null)
    setMemberships([])
    setMembership(null)
    setSession(null)
    setPlayer(null)
  }

  const handleGroupJoined = (memberData) => {
    setMemberships((prev) => [...prev, memberData])
    setMembership(memberData)
  }

  const handleSelectGroup = async (m) => {
    setMembership(m)
    await restoreSession(m, { setPlayer, setSession })
  }

  const handleSwitchGroup = () => {
    localStorage.removeItem('poker_session')
    reset()
    setMembership(null)
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
      }}>
        <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>Chargement...</p>
      </div>
    )
  }

  if (!authUser) return <LoginPage />

  if (authUser && memberships.length > 1 && !membership) {
    return (
      <GroupSelectPage
        memberships={memberships}
        onSelect={handleSelectGroup}
      />
    )
  }

  if (!membership) return <GroupPage user={authUser} onGroupJoined={handleGroupJoined} />

  if (!session) return (
    <LobbyPage
      membership={membership}
      onJoined={handleJoined}
      onLogout={handleLogout}
      onSwitchGroup={memberships.length > 1 ? handleSwitchGroup : null}
    />
  )

  return (
    <DashboardPage
      session={session}
      player={player}
      membership={membership}
      authUser={authUser}
      onLeave={handleLeave}
      onLogout={handleLogout}
    />
  )
}