/**
 * GroupSelectPage.jsx — Sélection du groupe actif
 *
 * Affichée quand un utilisateur appartient à plusieurs groupes.
 * Permet de choisir dans quel groupe se connecter ou d'en rejoindre/créer un nouveau.
 */

import { useState } from 'react'
import GroupPage from './GroupPage'
import { supabase } from '../lib/supabase'

export default function GroupSelectPage({ memberships, onSelect, authUser }) {
  const [showGroupModal, setShowGroupModal] = useState(false)

  const handleGroupJoined = (memberData) => {
    setShowGroupModal(false)
    onSelect(memberData)
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>🃏 Poker Range</h1>
        <p style={styles.subtitle}>Choisissez un groupe</p>
        <div style={styles.list}>
          {memberships.map((m) => (
            <button
              key={m.id}
              style={styles.groupBtn}
              onClick={() => onSelect(m)}
            >
              <span style={styles.groupName}>👥 {m.groups?.name}</span>
              <span style={styles.groupRole}>
                {m.role === 'master' ? '👑 Master' : '🎮 Joueur'}
              </span>
            </button>
          ))}

          {/* Bouton rejoindre / créer un groupe */}
          <button
            style={styles.newGroupBtn}
            onClick={() => setShowGroupModal(true)}
          >
            <span style={styles.newGroupName}>➕ Rejoindre / Créer un groupe</span>
          </button>
        </div>

        <button
          style={styles.logoutBtn}
          onClick={() => supabase.auth.signOut()}
        >
          Se déconnecter
        </button>
      </div>

      {/* Modal rejoindre / créer un groupe */}
      {showGroupModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <h3 style={styles.modalTitle}>Groupe</h3>
              <button style={styles.closeBtn} onClick={() => setShowGroupModal(false)}>✕</button>
            </div>
            <GroupPage
              user={authUser}
              onGroupJoined={handleGroupJoined}
              inline
            />
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', backgroundColor: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' },
  card: { backgroundColor: '#111', border: '1px solid #222', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '360px', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' },
  title: { color: 'white', fontSize: '28px', margin: 0 },
  subtitle: { color: '#666', fontSize: '14px', margin: 0 },
  list: { display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' },
  groupBtn: { padding: '16px', borderRadius: '8px', border: '1px solid #333', backgroundColor: '#1a1a1a', cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' },
  newGroupBtn: { padding: '16px', borderRadius: '8px', border: '1px solid #22c55e', backgroundColor: 'transparent', cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' },
  groupName: { color: 'white', fontSize: '15px', fontWeight: 'bold' },
  newGroupName: { color: '#22c55e', fontSize: '15px', fontWeight: 'bold' },
  groupRole: { color: '#666', fontSize: '12px' },
  logoutBtn: { padding: '8px', borderRadius: '8px', border: 'none', backgroundColor: 'transparent', color: '#444', fontSize: '12px', cursor: 'pointer' },
  modalOverlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: '16px' },
  modal: { backgroundColor: '#111', border: '1px solid #222', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '360px', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' },
  modalTitle: { color: 'white', fontSize: '16px', margin: 0 },
  closeBtn: { background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '18px' },
}