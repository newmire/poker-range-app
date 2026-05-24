import { useEffect, useState } from 'react'
import { getMembers, removeMember } from '../lib/session'

function getStatus(lastSeen) {
  if (!lastSeen) return { color: '#444', label: 'jamais vu' }
  const normalized = lastSeen.endsWith('Z') ? lastSeen : lastSeen + 'Z'
  const diff = Date.now() - new Date(normalized).getTime()
  if (diff < 60000) return { color: '#22c55e', label: 'en ligne' }
  if (diff < 300000) return { color: '#f59e0b', label: `vu il y a ${Math.floor(diff / 60000)} min` }
  return { color: '#444', label: `vu il y a ${Math.floor(diff / 60000)} min` }
}

export default function MembersPage({ membership, onClose }) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)

  const loadMembers = async () => {
    if (!membership?.group_id) return
    const data = await getMembers(membership.group_id)
    setMembers(data)
    setLoading(false)
  }

  useEffect(() => {
    loadMembers()
    const interval = setInterval(loadMembers, 30000)
    return () => clearInterval(interval)
  }, [membership])

  const handleRemove = async (m) => {
    await removeMember(m.id)
    setMembers((prev) => prev.filter((x) => x.id !== m.id))
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.container}>
        <div style={styles.header}>
          <h2 style={styles.title}>👥 Membres — {membership.groups?.name}</h2>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={styles.list}>
          {loading && <p style={styles.empty}>Chargement...</p>}
          {!loading && members.length === 0 && (
            <p style={styles.empty}>Aucun membre.</p>
          )}
          {members.map((m) => {
            const status = getStatus(m.last_seen)
            return (
              <div key={m.id} style={styles.memberRow}>
                <div style={styles.memberInfo}>
                  <div style={styles.memberNameRow}>
                    <span style={{ ...styles.dot, backgroundColor: status.color }} />
                    <span style={styles.memberName}>{m.username}</span>
                  </div>
                  <span style={styles.memberRole}>
                    {m.role === 'master' ? '👑 Master' : '🎮 Joueur'} · {status.label}
                  </span>
                </div>
                {m.role !== 'master' && (
                  <button style={styles.removeBtn} onClick={() => handleRemove(m)}>
                    Retirer
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const styles = {
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: '16px' },
  container: { backgroundColor: '#111', border: '1px solid #222', borderRadius: '16px', width: '100%', maxWidth: '400px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid #222' },
  title: { color: 'white', fontSize: '16px', margin: 0 },
  closeBtn: { background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '18px' },
  list: { padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' },
  memberRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', borderRadius: '8px', backgroundColor: '#1a1a1a', border: '1px solid #222' },
  memberInfo: { display: 'flex', flexDirection: 'column', gap: '4px' },
  memberNameRow: { display: 'flex', alignItems: 'center', gap: '8px' },
  dot: { width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0 },
  memberName: { color: 'white', fontSize: '14px', fontWeight: 'bold' },
  memberRole: { color: '#666', fontSize: '12px', paddingLeft: '16px' },
  removeBtn: { padding: '6px 12px', borderRadius: '6px', border: '1px solid #ef4444', backgroundColor: 'transparent', color: '#ef4444', cursor: 'pointer', fontSize: '12px' },
  empty: { color: '#444', fontSize: '13px', fontStyle: 'italic', margin: 0 },
}