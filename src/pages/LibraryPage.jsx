import { useEffect, useState } from 'react'
import { getSavedRanges, deleteRange } from '../lib/session'
import RangeGrid from '../components/RangeGrid/RangeGrid'

export default function LibraryPage({ membership, onClose, onUseRange }) {
  const [ranges, setRanges] = useState([])
  const [selected, setSelected] = useState(null)
  const [filterPosition, setFilterPosition] = useState('')
  const [filterVersus, setFilterVersus] = useState('')
  const [filterVisibility, setFilterVisibility] = useState('')
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (!membership?.user_id || !membership?.group_id) return
    getSavedRanges(membership.user_id, membership.group_id).then(setRanges)
  }, [membership])

  const handleDelete = async (r) => {
    await deleteRange(r.id)
    setRanges((prev) => prev.filter((x) => x.id !== r.id))
    if (selected?.id === r.id) setSelected(null)
  }

  const canDelete = (r) => {
    if (membership.role === 'master') return true
    return r.user_id === membership.user_id && !r.is_shared
  }

  const filtered = ranges.filter((r) => {
    if (filterPosition && r.context?.position !== filterPosition) return false
    if (filterVersus && r.context?.versus !== filterVersus) return false
    if (filterVisibility === 'personal' && r.is_shared) return false
    if (filterVisibility === 'shared' && !r.is_shared) return false
    return true
  })

  const positions = [...new Set(ranges.map((r) => r.context?.position).filter(Boolean))]

  // Vue mobile — grille sélectionnée
  if (isMobile && selected) {
    return (
      <div style={styles.overlay}>
        <div style={{ ...styles.container, maxHeight: '100vh' }}>
          <div style={styles.header}>
            <button style={styles.backBtn} onClick={() => setSelected(null)}>← Retour</button>
            <h2 style={styles.titleSmall}>{selected.name}</h2>
            <button style={styles.closeBtn} onClick={onClose}>✕</button>
          </div>
          <p style={styles.previewContextMobile}>
            {selected.context?.position} · {selected.context?.stackSize}BB · {selected.context?.versus === 'fish' ? 'Fish' : 'Reg'}
            {selected.is_shared ? ' · 👥' : ' · 🔒'}
          </p>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8px', gap: '12px', overflowY: 'auto' }}>
            <RangeGrid overrideMatrix={selected.range} readOnly compact />
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {onUseRange && (
                <button style={styles.useBtn} onClick={() => onUseRange(selected)}>
                  Utiliser cette range
                </button>
              )}
              {canDelete(selected) && (
                <button style={styles.deleteBtnLarge} onClick={() => handleDelete(selected)}>
                  🗑️ Supprimer
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.container}>
        <div style={styles.header}>
          <h2 style={styles.title}>📚 Bibliothèque de ranges</h2>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={styles.filters}>
          <select
            style={styles.select}
            value={filterPosition}
            onChange={(e) => setFilterPosition(e.target.value)}
          >
            <option value="">Toutes positions</option>
            {positions.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select
            style={styles.select}
            value={filterVersus}
            onChange={(e) => setFilterVersus(e.target.value)}
          >
            <option value="">Reg + Fish</option>
            <option value="reg">Reg</option>
            <option value="fish">Fish</option>
          </select>
          <select
            style={styles.select}
            value={filterVisibility}
            onChange={(e) => setFilterVisibility(e.target.value)}
          >
            <option value="">Toutes</option>
            <option value="personal">🔒 Personnelles</option>
            <option value="shared">👥 Partagées</option>
          </select>
        </div>

        <div style={isMobile ? styles.bodyMobile : styles.body}>
          {/* Liste */}
          <div style={isMobile ? styles.listMobile : styles.list}>
            {filtered.length === 0 && (
              <p style={styles.empty}>Aucune range sauvegardée.</p>
            )}
            {filtered.map((r) => (
              <div key={r.id} style={{ position: 'relative' }}>
                <button
                  style={{
                    ...styles.rangeBtn,
                    borderColor: selected?.id === r.id ? '#22c55e' : '#333',
                    color: selected?.id === r.id ? '#22c55e' : '#ccc',
                  }}
                  onClick={() => setSelected(r)}
                >
                  <span style={styles.rangeName}>{r.name}</span>
                  <span style={styles.rangeContext}>
                    {r.context?.position} · {r.context?.stackSize}BB · {r.context?.versus === 'fish' ? 'Fish' : 'Reg'}
                    {r.is_shared ? ' · 👥' : ' · 🔒'}
                  </span>
                </button>
                {canDelete(r) && (
                  <button
                    style={styles.deleteBtn}
                    onClick={(e) => { e.stopPropagation(); handleDelete(r) }}
                  >
                    🗑️
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Grille desktop uniquement */}
          {!isMobile && (
            <div style={styles.preview}>
              {selected ? (
                <>
                  <p style={styles.previewTitle}>{selected.name}</p>
                  <RangeGrid overrideMatrix={selected.range} readOnly compact />
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {onUseRange && (
                      <button style={styles.useBtn} onClick={() => onUseRange(selected)}>
                        Utiliser cette range
                      </button>
                    )}
                    {canDelete(selected) && (
                      <button style={styles.deleteBtnLarge} onClick={() => handleDelete(selected)}>
                        🗑️ Supprimer
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <p style={styles.empty}>Sélectionne une range pour la visualiser.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const styles = {
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: '16px' },
  container: { backgroundColor: '#111', border: '1px solid #222', borderRadius: '16px', width: '100%', maxWidth: '1000px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid #222' },
  title: { color: 'white', fontSize: '18px', margin: 0 },
  titleSmall: { color: 'white', fontSize: '15px', margin: 0, flex: 1, textAlign: 'center' },
  backBtn: { background: 'transparent', border: 'none', color: '#22c55e', cursor: 'pointer', fontSize: '14px', padding: 0 },
  closeBtn: { background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '18px' },
  filters: { display: 'flex', gap: '8px', padding: '12px 24px', borderBottom: '1px solid #222', flexWrap: 'wrap' },
  select: { padding: '8px 12px', borderRadius: '8px', border: '1px solid #333', backgroundColor: '#1a1a1a', color: 'white', fontSize: '13px', cursor: 'pointer', outline: 'none' },
  body: { display: 'flex', flex: 1, overflow: 'hidden' },
  bodyMobile: { display: 'flex', flex: 1, flexDirection: 'column', overflow: 'hidden' },
  list: { width: '240px', flexShrink: 0, borderRight: '1px solid #222', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto' },
  listMobile: { flex: 1, padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto' },
  rangeBtn: { padding: '10px', borderRadius: '8px', border: '1px solid #333', backgroundColor: '#1a1a1a', cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '2px', width: '100%' },
  rangeName: { color: 'white', fontSize: '13px', fontWeight: 'bold' },
  rangeContext: { color: '#666', fontSize: '11px' },
  deleteBtn: { position: 'absolute', top: '6px', right: '6px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '14px', opacity: 0.5 },
  preview: { flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', overflowY: 'auto' },
  previewTitle: { color: 'white', fontSize: '16px', fontWeight: 'bold', margin: 0 },
  previewContextMobile: { color: '#666', fontSize: '12px', margin: 0, textAlign: 'center', padding: '4px 24px' },
  useBtn: { padding: '12px 24px', borderRadius: '8px', border: 'none', backgroundColor: '#22c55e', color: 'white', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' },
  deleteBtnLarge: { padding: '12px 24px', borderRadius: '8px', border: '1px solid #ef4444', backgroundColor: 'transparent', color: '#ef4444', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' },
  empty: { color: '#444', fontSize: '13px', fontStyle: 'italic', margin: 0 },
}