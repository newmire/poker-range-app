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
 *
 * @param {object} authSession - Session Supabase Auth
 * @param {object} handlers - Setters React du composant App
 */
async function handleAuthSession(authSession, { setAuthUser, setMembership, setPlayer, setSession, setLoading }) {
  // Stocke l'utilisateur connecté
  setAuthUser(authSession.user)

  // Récupère le membership du groupe (rôle, pseudo, groupe)
  const { data: memberData } = await supabase
    .from('memberships')
    .select('*, groups(*)')
    .eq('user_id', authSession.user.id)
    .single()

  setMembership(memberData ?? null)

  // Tente de reconnecter à une session live sauvegardée dans le localStorage
  const saved = localStorage.getItem('poker_session')
  if (saved) {
    const { playerId, sessionId } = JSON.parse(saved)

    const { data: playerData } = await supabase
      .from('players')
      .select()
      .eq('id', playerId)
      .single()

    // Vérifie que le joueur appartient bien à la session sauvegardée
    if (playerData && playerData.session_id === sessionId) {
      const { data: sessionData } = await supabase
        .from('sessions')
        .select()
        .eq('id', sessionId)
        .single()

      if (sessionData) {
        // Restaure la session et la range dans le store
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
        // Session introuvable en base → on vide le localStorage
        localStorage.removeItem('poker_session')
      }
    } else {
      // Joueur invalide ou session différente → on vide le localStorage
      localStorage.removeItem('poker_session')
    }
  }

  setLoading(false)
}

export default function App() {
  const [authUser, setAuthUser] = useState(null)       // Utilisateur Supabase Auth
  const [membership, setMembership] = useState(null)   // Membership du groupe
  const [session, setSession] = useState(null)         // Session live active
  const [player, setPlayer] = useState(null)           // Joueur courant dans la session
  const [loading, setLoading] = useState(true)         // Chargement initial
  const reset = useRangeStore((state) => state.reset)  // Reset du store Zustand

  useEffect(() => {
    const handlers = { setAuthUser, setMembership, setPlayer, setSession, setLoading }

    // Vérifie s'il y a déjà une session auth active au démarrage
    supabase.auth.getSession().then(async ({ data: { session: authSession }, error }) => {
      if (error || !authSession) {
        setLoading(false)
        return
      }
      await handleAuthSession(authSession, handlers)
    }).catch(e => {
      console.error('getSession catch:', e)
      setLoading(false)
    })

    // Écoute les changements d'état auth (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, authSession) => {
      if (!authSession) {
        setAuthUser(null)
        setMembership(null)
        setLoading(false)
        return
      }
      await handleAuthSession(authSession, handlers)
    })

    return () => subscription.unsubscribe()
  }, [])

  /**
   * Appelé quand le joueur rejoint ou crée une session live.
   * Sauvegarde les ids dans le localStorage pour la reconnexion automatique.
   */
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

  /**
   * Appelé quand le joueur quitte la session live.
   * Vide le localStorage et reset le store.
   */
  const handleLeave = () => {
    localStorage.removeItem('poker_session')
    reset()
    setSession(null)
    setPlayer(null)
  }

  /**
   * Appelé quand l'utilisateur se déconnecte complètement.
   * Vide tout et déconnecte Supabase Auth.
   */
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

  // Écran de chargement initial
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

  // Routing selon l'état de l'application
  if (!authUser) return <LoginPage />
  if (!membership) return <GroupPage user={authUser} onGroupJoined={handleGroupJoined} />
  if (!session) return <LobbyPage membership={membership} onJoined={handleJoined} onLogout={handleLogout} />

  return <DashboardPage session={session} player={player} membership={membership} authUser={authUser} onLeave={handleLeave} onLogout={handleLogout} />
}