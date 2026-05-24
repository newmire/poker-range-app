/**
 * GroupSelectPage.jsx — Sélection du groupe actif
 *
 * Affichée quand un utilisateur appartient à plusieurs groupes.
 * Permet de choisir dans quel groupe se connecter.
 */

export default function GroupSelectPage({ memberships, onSelect }) {
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
        </div>
      </div>
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
  groupName: { color: 'white', fontSize: '15px', fontWeight: 'bold' },
  groupRole: { color: '#666', fontSize: '12px' },
}