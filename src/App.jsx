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

function saveUserToLocal(user, memberships) {
  localStorage.setItem(LOCAL_USER_KEY, JSON.stringify({
    id: user.id,
    email: user.email,
    username: user.user_metadata?.username ?? user.email,
    memberships,
  }))
}

function loadUserFromLocal() {
  try {
    const raw = localStorage.getItem(LOCAL_USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

async function handleAuthSession(authSession, { setAuthUser, setMemberships, setMembership, setPlayer, setSession, setLoading, setSupabaseReady }) {
  setAuthUser(authSession.user)

  const { data: memberData } = await supabase
    .from('memberships')
    .select('*, groups(*)')
    .eq('user_id', authSession.user.id)

  const memberships = Array.isArray(memberData) ? memberData : []
  setMemberships(memberships)
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
  const [authError, setAuthError] = useState(null)
  const [slowConnection, setSlowConnection] = useState(false)
  const [coldStart, setColdStart] = useState(false)
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false)
  const [supabaseReady, setSupabaseReady] = useState(false)

  const reset = useRangeStore((state) => state.reset)

  useEffect(() => {
    const handlers = { setAuthUser, setMemberships, setMembership, setPlayer, setSession, setLoading, setSupabaseReady }

    const hash = window.location.hash
    if (hash.includes('type=recovery')) {
      setIsPasswordRecovery(true)
      setLoading(false)
      return
    }

    const slowTimeout = setTimeout(() => setSlowConnection(true), 5000)
    const coldStartTimeout = setTimeout(() => setColdStart(true), 10000)
    const absoluteTimeout = setTimeout(() => setLoading(false), 35000)

    const cached = loadUserFromLocal()
    if (cached) {
      const validMemberships = (cached.memberships ?? []).filter(m => m?.groups)
      if (validMemberships.length > 0) {
        setAuthUser({ id: cached.id, email: cached.email, user_metadata: { username: cached.username } })
        setMemberships(validMemberships)
        if (validMemberships.length === 1) setMembership(validMemberships[0])
        clearTimeout(slowTimeout)
        clearTimeout(coldStartTimeout)
        clearTimeout(absoluteTimeout)
        setLoading(false)
      }
    }

    let handled = false

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, authSession) => {
      handled = true
      clearTimeout(slowTimeout)
      clearTimeout(coldStartTimeout)
      clearTimeout(absoluteTimeout)
      setSlowConnection(false)
      setColdStart(false)

      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true)
        setLoading(false)
        return
      }

      if (event === 'TOKEN_REFRESHED' && !authSession) {
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
        localStorage.removeItem(LOCAL_USER_KEY)
        localStorage.removeItem('poker_session')
        setAuthUser(null)
        setMemberships([])
        setMembership(null)
        setLoading(false)
        return
      }

      // Token validé — les appels DB peuvent passer dès maintenant
      setSupabaseReady(true)
      await handleAuthSession(authSession, handlers)
    })

    const fallbackTimeout = setTimeout(async () => {
      if (handled) return
      handled = true
      try {
        const { data: { session: authSession }, error } = await supabase.auth.getSession()
        if (error || !authSession) {
          if (!cached) {
            localStorage.removeItem(LOCAL_USER_KEY)
            setAuthUser(null)
            setMemberships([])
            setMembership(null)
            setLoading(false)
          }
          return
        }
        clearTimeout(slowTimeout)
        clearTimeout(coldStartTimeout)
        clearTimeout(absoluteTimeout)
        setSlowConnection(false)
        setColdStart(false)
        setSupabaseReady(true)
        await handleAuthSession(authSession, handlers)
      } catch (e) {
        if (!cached) {
          setAuthError('Impossible de se connecter. Vérifiez votre connexion réseau.')
          setLoading(false)
        }
      }
    }, 3000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(slowTimeout)
      clearTimeout(coldStartTimeout)
      clearTimeout(fallbackTimeout)
      clearTimeout(absoluteTimeout)
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

  const handleLogout = () => {
    // Nettoie l'état immédiatement — ne pas attendre signOut() qui peut hang sur mobile
    localStorage.removeItem('poker_session')
    localStorage.removeItem(LOCAL_USER_KEY)
    reset()
    setAuthUser(null)
    setMemberships([])
    setMembership(null)
    setSession(null)
    setPlayer(null)
    // signOut en fire-and-forget
    supabase.auth.signOut().catch(() => {})
  }

  const handleGroupJoined = (memberData) => {
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

  const waitingForMemberships = authUser && memberships.length === 0 && loadUserFromLocal() !== null

  if (loading || waitingForMemberships) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '24px' }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" style={{ animation: 'spin 1s linear infinite' }}>
          <circle cx="12" cy="12" r="10" strokeOpacity="0.2"/>
          <path d="M12 2a10 10 0 0 1 10 10"/>
          <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
        </svg>
        {!slowConnection && !coldStart && <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>Chargement...</p>}
        {slowConnection && !coldStart && <p style={{ color: '#f59e0b', fontSize: '13px', margin: 0, textAlign: 'center', maxWidth: '280px' }}>Connexion en cours, merci de patienter...</p>}
        {coldStart && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <p style={{ color: '#f59e0b', fontSize: '14px', margin: 0, textAlign: 'center', maxWidth: '300px', fontWeight: 'bold' }}>⏳ Réactivation du serveur en cours</p>
            <p style={{ color: '#666', fontSize: '13px', margin: 0, textAlign: 'center', maxWidth: '300px', lineHeight: '1.5' }}>Le serveur se réveille après une période d'inactivité. Cela peut prendre 20 à 30 secondes.</p>
          </div>
        )}
        {authError && (
          <>
            <p style={{ color: '#ef4444', fontSize: '13px', margin: 0, textAlign: 'center', maxWidth: '280px' }}>{authError}</p>
            <button onClick={() => window.location.reload()} style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', backgroundColor: '#22c55e', color: 'white', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' }}>Réessayer</button>
          </>
        )}
      </div>
    )
  }

  if (isPasswordRecovery) {
    return <ResetPasswordPage onDone={() => { setIsPasswordRecovery(false); window.history.replaceState(null, '', window.location.pathname) }} />
  }

  if (!authUser) return <LoginPage />

  if (authUser && memberships.length > 1 && !membership) {
    return <GroupSelectPage memberships={memberships} onSelect={handleSelectGroup} authUser={authUser} />
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
      supabaseReady={supabaseReady}
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