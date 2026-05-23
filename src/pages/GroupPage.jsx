import { useState } from 'react'
import { supabase } from '../lib/supabase'

function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export default function GroupPage({ user, onGroupJoined }) {
  const [mode, setMode] = useState(null) // 'create' | 'join'
  const [groupName, setGroupName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const username = user.user_metadata?.username ?? user.email

  const handleCreate = async () => {
    if (!groupName.trim()) return setError('Entrez un nom de groupe')
    setLoading(true)
    setError(null)
    try {
      const code = generateInviteCode()
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .insert({ name: groupName.trim(), invite_code: code })
        .select()
        .single()
      if (groupError) throw groupError

      const { data: member, error: memberError } = await supabase
        .from('memberships')
        .insert({ user_id: user.id, group_id: group.id, role: 'master', username })
        .select('*, groups(*)')
        .single()
      if (memberError) throw memberError

      onGroupJoined(member)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleJoin = async () => {
    if (!inviteCode.trim()) return setError('Entrez le code d\'invitation')
    setLoading(true)
    setError(null)
    try {
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .select()
        .eq('invite_code', inviteCode.trim().toUpperCase())
        .single()
      if (groupError || !group) throw new Error('Code invalide')

      const { data: member, error: memberError } = await supabase
        .from('memberships')
        .insert({ user_id: user.id, group_id: group.id, role: 'member', username })
        .select('*, groups(*)')
        .single()
      if (memberError) throw memberError

      onGroupJoined(member)
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
        <p style={styles.subtitle}>Bienvenue, <strong style={{ color: 'white' }}>{username}</strong></p>
        <p style={styles.hint}>Rejoignez ou créez un groupe pour continuer.</p>

        {!mode && (
          <div style={styles.buttons}>
            <button style={styles.btnPrimary} onClick={() => setMode('create')}>
              Créer un groupe
            </button>
            <button style={styles.btnSecondary} onClick={() => setMode('join')}>
              Rejoindre un groupe
            </button>
          </div>
        )}

        {mode === 'create' && (
          <div style={styles.form}>
            <input
              style={styles.input}
              placeholder="Nom du groupe (ex: Team Poker FR)"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
            {error && <p style={styles.error}>{error}</p>}
            <button style={styles.btnPrimary} onClick={handleCreate} disabled={loading}>
              {loading ? 'Création...' : 'Créer'}
            </button>
            <button style={styles.btnSecondary} onClick={() => { setMode(null); setError(null) }}>
              Retour
            </button>
          </div>
        )}

        {mode === 'join' && (
          <div style={styles.form}>
            <input
              style={styles.input}
              placeholder="Code d'invitation (ex: ABC12345)"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              maxLength={8}
            />
            {error && <p style={styles.error}>{error}</p>}
            <button style={styles.btnPrimary} onClick={handleJoin} disabled={loading}>
              {loading ? 'Connexion...' : 'Rejoindre'}
            </button>
            <button style={styles.btnSecondary} onClick={() => { setMode(null); setError(null) }}>
              Retour
            </button>
          </div>
        )}

        <button style={styles.logoutBtn} onClick={() => supabase.auth.signOut()}>
          Se déconnecter
        </button>
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', backgroundColor: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' },
  card: { backgroundColor: '#111', border: '1px solid #222', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '360px', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' },
  title: { color: 'white', fontSize: '28px', margin: 0 },
  subtitle: { color: '#666', fontSize: '14px', margin: 0 },
  hint: { color: '#444', fontSize: '13px', margin: 0, textAlign: 'center' },
  buttons: { display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' },
  form: { display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' },
  input: { padding: '12px', borderRadius: '8px', border: '1px solid #333', backgroundColor: '#1a1a1a', color: 'white', fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box' },
  btnPrimary: { padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: '#22c55e', color: 'white', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', width: '100%' },
  btnSecondary: { padding: '12px', borderRadius: '8px', border: '1px solid #333', backgroundColor: 'transparent', color: '#aaa', fontSize: '14px', cursor: 'pointer', width: '100%' },
  logoutBtn: { padding: '8px', borderRadius: '8px', border: 'none', backgroundColor: 'transparent', color: '#444', fontSize: '12px', cursor: 'pointer', marginTop: '8px' },
  error: { color: '#ef4444', fontSize: '13px', margin: 0 },
}