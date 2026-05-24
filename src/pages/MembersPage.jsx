import { useEffect, useState } from 'react'
import { getMembers, removeMember } from '../lib/session'

export default function MembersPage({ membership, onClose }) {
  const [members, setMembers] = useState([])

  useEffect(() => {
    if (!membership?.group_id) return
    getMembers(membership.group_id).then(setMembers)
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
          {members.map((m) => (
            <div key={m.id} style={styles.memberRow}>
              <div style={styles.memberInfo}>
                <span style={styles.memberName}>{m.username}</span>
                <span style={styles.memberRole}>
                  {m.role === 'master' ? '👑 Master' : '🎮 Joueur'}
                </span>
              </div>
              {m.role !== 'master' && (
                <button
                  style={styles.removeBtn}
                  onClick={() => handleRemove(m)}
                >
                  Retirer
                </button>
              )}
            </div>
          ))}
          {members.length === 0 && (
            <p style={styles.empty}>Aucun membre.</p>
          )}
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
  memberInfo: { display: 'flex', flexDirection: 'column', gap: '2px' },
  memberName: { color: 'white', fontSize: '14px', fontWeight: 'bold' },
  memberRole: { color: '#666', fontSize: '12px' },
  removeBtn: { padding: '6px 12px', borderRadius: '6px', border: '1px solid #ef4444', backgroundColor: 'transparent', color: '#ef4444', cursor: 'pointer', fontSize: '12px' },
  empty: { color: '#444', fontSize: '13px', fontStyle: 'italic', margin: 0 },
}