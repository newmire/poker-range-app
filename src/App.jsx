/**
 * App.jsx — Point d'entrée principal de l'application
 *
 * Gère :
 * - L'authentification Supabase (connexion persistante)
 * - La reconnexion automatique à une session live via localStorage
 * - Le routing entre les pages (Login → GroupSelect → Group → Lobby → Dashboard)
 * - La gestion multi-groupes (un utilisateur peut appartenir à plusieurs groupes)
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
  // Si plusieurs groupes → GroupSelectPage (membership reste null)

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
  const [loadingTooLong, setLoadingTooLong] = useState(false)
  const reset = useRangeStore((state) => state.reset)

  useEffect(() => {
    const handlers = { setAuthUser, setMemberships, setMembership, setPlayer, setSession, setLoading }
    let handled = false

    const slowTimeout = setTimeout(() => {
      setLoadingTooLong(true)
    }, 5000)

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, authSession) => {
      console.log('onAuthStateChange:', event, !!authSession)
      handled = true
      clearTimeout(slowTimeout)
      setLoadingTooLong(false)

      if (event === 'TOKEN_REFRESHED' && !authSession) {
        localStorage.clear()
        setAuthUser(null)
        setMemberships([])
        setMembership(null)
        setLoading(false)
        return
      }

      if (!authSession) {
        localStorage.removeItem('poker_session')
        setAuthUser(null)
        setMemberships([])
        setMembership(null)
        setLoading(false)
        return
      }

      await handleAuthSession(authSession, handlers)
    })

    const fallbackTimeout = setTimeout(async () => {
      if (handled) return
      console.log('fallback getSession')
      try {
        const { data: { session: authSession }, error } = await supabase.auth.getSession()
        if (error) {
          console.error('fallback getSession error:', error)
          localStorage.clear()
          setLoading(false)
          return
        }
        if (!authSession) {
          setLoading(false)
          return
        }
        await handleAuthSession(authSession, handlers)
      } catch (e) {
        console.error('fallback error:', e)
        localStorage.clear()
        setLoading(false)
      }
    }, 3000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(slowTimeout)
      clearTimeout(fallbackTimeout)
    }
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

  // Sélection d'un groupe — vide la session précédente pour aller au lobby
  const handleSelectGroup = (m) => {
    localStorage.removeItem('poker_session')
    reset()
    setSession(null)
    setPlayer(null)
    setMembership(m)
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
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
      }}>
        <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>Chargement...</p>
        {loadingTooLong && (
          <>
            <p style={{ color: '#444', fontSize: '12px', margin: 0 }}>La connexion prend du temps...</p>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '10px 24px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#22c55e',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              Réessayer
            </button>
          </>
        )}
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