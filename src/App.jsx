/**
 * App.jsx — Point d'entrée principal de l'application
 *
 * Gère :
 * - L'authentification Supabase (connexion persistante)
 * - La reconnexion automatique via localStorage (instantanée au refresh)
 * - Vérification du token Supabase en arrière-plan
 * - Le routing entre les pages (Login → GroupSelect → Group → Lobby → Dashboard)
 * - La gestion multi-groupes
 * - La réinitialisation du mot de passe (event PASSWORD_RECOVERY)
 */

import { useState, useEffect } from 'react'
import LobbyPage from './pages/LobbyPage'
import DashboardPage from './pages/DashboardPage'
import LoginPage from './pages/LoginPage'
import GroupPage from './pages/GroupPage'
import GroupSelectPage from './pages/GroupSelectPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import { supabase } from './lib/supabase'
import { useRangeStore } from './stores/rangeStore'

const LOCAL_USER_KEY = 'poker_user'

/**
 * Sauvegarde les infos utilisateur dans le localStorage.
 * Appelé à chaque connexion réussie.
 */
function saveUserToLocal(user, memberships) {
  localStorage.setItem(LOCAL_USER_KEY, JSON.stringify({
    id: user.id,
    email: user.email,
    username: user.user_metadata?.username ?? user.email,
    memberships,
  }))
}

/**
 * Relit les infos utilisateur depuis le localStorage.
 * Retourne null si rien n'est stocké.
 */
function loadUserFromLocal() {
  try {
    const raw = localStorage.getItem(LOCAL_USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

async function handleAuthSession(authSession, { setAuthUser, setMemberships, setMembership, setPlayer, setSession, setLoading }) {
  setAuthUser(authSession.user)

  const { data: memberData } = await supabase
    .from('memberships')
    .select('*, groups(*)')
    .eq('user_id', authSession.user.id)

  const memberships = memberData ?? []
  setMemberships(memberships)

  // Sauvegarde dans le localStorage pour le prochain refresh
  saveUserToLocal(authSession.user, memberships)

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
  const [authError, setAuthError] = useState(null) // Erreur auth affichée à l'écran
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false)

  const reset = useRangeStore((state) => state.reset)

  useEffect(() => {
    const handlers = { setAuthUser, setMemberships, setMembership, setPlayer, setSession, setLoading }

    // ─── Détection d'un lien de recovery dans l'URL ──────────────────────────
    const hash = window.location.hash
    if (hash.includes('type=recovery')) {
      setIsPasswordRecovery(true)
      setLoading(false)
      return
    }

    // ─── Chargement instantané depuis le localStorage ────────────────────────
    // Si on a des infos en cache, on affiche l'app immédiatement
    // sans attendre Supabase
    const cached = loadUserFromLocal()
    if (cached) {
      setAuthUser({ id: cached.id, email: cached.email, user_metadata: { username: cached.username } })
      setMemberships(cached.memberships ?? [])
      if ((cached.memberships ?? []).length === 1) {
        setMembership(cached.memberships[0])
      }
      setLoading(false) // ← affichage instantané
    }

    // ─── Vérification Supabase en arrière-plan ───────────────────────────────
    // On vérifie quand même que le token est valide et on met à jour les données
    let handled = false

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, authSession) => {
      handled = true

      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true)
        setLoading(false)
        return
      }

      if (event === 'TOKEN_REFRESHED' && !authSession) {
        // Token expiré et non renouvelable → déconnexion propre
        localStorage.removeItem(LOCAL_USER_KEY)
        localStorage.removeItem('poker_session')
        setAuthUser(null)
        setMemberships([])
        setMembership(null)
        setSession(null)
        setPlayer(null)
        setLoading(false)
        return
      }

      if (!authSession) {
        // Pas de session → déconnexion
        localStorage.removeItem(LOCAL_USER_KEY)
        localStorage.removeItem('poker_session')
        setAuthUser(null)
        setMemberships([])
        setMembership(null)
        setLoading(false)
        return
      }

      // Session valide → met à jour les données en arrière-plan
      // Si on avait déjà chargé depuis le cache, setLoading est déjà false
      // handleAuthSession va juste rafraîchir les memberships silencieusement
      await handleAuthSession(authSession, handlers)
    })

    // Fallback : si onAuthStateChange ne se déclenche pas dans les 3s
    const fallbackTimeout = setTimeout(async () => {
      if (handled) return
      handled = true
      try {
        const { data: { session: authSession }, error } = await supabase.auth.getSession()
        if (error || !authSession) {
          // Pas de session valide
          if (!cached) {
            // Pas de cache non plus → page de connexion
            localStorage.removeItem(LOCAL_USER_KEY)
            setAuthUser(null)
            setMemberships([])
            setMembership(null)
            setLoading(false)
          }
          // Si on avait un cache, on reste connecté jusqu'à expiration
          return
        }
        await handleAuthSession(authSession, handlers)
      } catch (e) {
        // Erreur réseau — si on a un cache on reste connecté, sinon page de connexion
        if (!cached) {
          setAuthError('Impossible de se connecter. Vérifiez votre connexion réseau.')
          setLoading(false)
        }
      }
    }, 3000)

    return () => {
      subscription.unsubscribe()
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
    localStorage.removeItem(LOCAL_USER_KEY)
    reset()
    await supabase.auth.signOut()
    setAuthUser(null)
    setMemberships([])
    setMembership(null)
    setSession(null)
    setPlayer(null)
  }

  const handleGroupJoined = (memberData) => {
    // Met à jour le cache local avec le nouveau groupe
    const cached = loadUserFromLocal()
    if (cached) {
      saveUserToLocal(
        { id: cached.id, email: cached.email, user_metadata: { username: cached.username } },
        [...(cached.memberships ?? []), memberData]
      )
    }
    setMemberships((prev) => [...prev, memberData])
    setMembership(memberData)
  }

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

  const handleLeaveGroup = () => {
    localStorage.removeItem('poker_session')
    reset()
    const remaining = memberships.filter((m) => m.id !== membership.id)
    // Met à jour le cache local
    const cached = loadUserFromLocal()
    if (cached) {
      saveUserToLocal(
        { id: cached.id, email: cached.email, user_metadata: { username: cached.username } },
        remaining
      )
    }
    setMemberships(remaining)
    setMembership(null)
    setSession(null)
    setPlayer(null)
  }

  // ─── Écran de chargement ─────────────────────────────────────────────────
  // Affiché uniquement si pas de cache local (première visite ou déconnecté)
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
        {authError && (
          <>
            <p style={{ color: '#ef4444', fontSize: '13px', margin: 0, textAlign: 'center', maxWidth: '280px' }}>
              {authError}
            </p>
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

  if (isPasswordRecovery) {
    return (
      <ResetPasswordPage
        onDone={() => {
          setIsPasswordRecovery(false)
          window.history.replaceState(null, '', window.location.pathname)
        }}
      />
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
      onLeaveGroup={handleLeaveGroup}
      authUser={authUser}
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