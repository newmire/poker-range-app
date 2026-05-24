/**
 * App.jsx — Point d'entrée principal de l'application
 *
 * Gère :
 * - L'authentification Supabase (connexion persistante)
 * - La reconnexion automatique à une session live via localStorage
 * - Le routing entre les pages (Login → Group → Lobby → Dashboard)
 */

import { useState, useEffect } from 'react'
import LobbyPage from './pages/LobbyPage'
import DashboardPage from './pages/DashboardPage'
import LoginPage from './pages/LoginPage'
import GroupPage from './pages/GroupPage'
import { supabase } from './lib/supabase'
import { useRangeStore } from './stores/rangeStore'

/**
 * Fonction extraite du composant pour éviter les problèmes de closure dans useEffect.
 * Appelée à chaque changement d'état auth (connexion, reconnexion, rechargement).
 */
async function handleAuthSession(authSession, { setAuthUser, setMembership, setPlayer, setSession, setLoading }) {
  setAuthUser(authSession.user)

  const { data: memberData } = await supabase
    .from('memberships')
    .select('*, groups(*)')
    .eq('user_id', authSession.user.id)
    .single()

  setMembership(memberData ?? null)

  const saved = localStorage.getItem('poker_session')
  if (saved) {
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

  setLoading(false)
}

export default function App() {
  const [authUser, setAuthUser] = useState(null)
  const [membership, setMembership] = useState(null)
  const [session, setSession] = useState(null)
  const [player, setPlayer] = useState(null)
  const [loading, setLoading] = useState(true)
  const reset = useRangeStore((state) => state.reset)

  useEffect(() => {
    const handlers = { setAuthUser, setMembership, setPlayer, setSession, setLoading }

    // Timeout de sécurité — si getSession ne répond pas en 8 secondes on affiche la page de connexion
    const timeout = setTimeout(() => {
      setLoading((prev) => {
        if (prev) {
          console.warn('getSession timeout')
          return false
        }
        return prev
      })
    }, 8000)

    supabase.auth.getSession().then(async ({ data: { session: authSession }, error }) => {
      clearTimeout(timeout)
      if (error || !authSession) {
        setLoading(false)
        return
      }
      await handleAuthSession(authSession, handlers)
    }).catch(e => {
      clearTimeout(timeout)
      console.error('getSession catch:', e)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, authSession) => {
      if (!authSession) {
        setAuthUser(null)
        setMembership(null)
        setLoading(false)
        return
      }
      await handleAuthSession(authSession, handlers)
    })

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
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
    setMembership(null)
    setSession(null)
    setPlayer(null)
  }

  const handleGroupJoined = (memberData) => {
    setMembership(memberData)
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
        Chargement...
      </div>
    )
  }

  if (!authUser) return <LoginPage />
  if (!membership) return <GroupPage user={authUser} onGroupJoined={handleGroupJoined} />
  if (!session) return <LobbyPage membership={membership} onJoined={handleJoined} onLogout={handleLogout} />

  return <DashboardPage session={session} player={player} membership={membership} authUser={authUser} onLeave={handleLeave} onLogout={handleLogout} />
}