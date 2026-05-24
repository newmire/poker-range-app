import { useEffect, useState } from 'react'
import { getSavedRanges } from '../lib/session'
import RangeGrid from '../components/RangeGrid/RangeGrid'

export default function LibraryPage({ membership, onClose, onUseRange }) {
  const [ranges, setRanges] = useState([])
  const [selected, setSelected] = useState(null)
  const [filterPosition, setFilterPosition] = useState('')
  const [filterVersus, setFilterVersus] = useState('')

  useEffect(() => {
    if (!membership?.user_id || !membership?.group_id) return
    console.log('fetching ranges for:', membership.user_id, membership.group_id)
    getSavedRanges(membership.user_id, membership.group_id).then((data) => {
      console.log('ranges:', data)
      setRanges(data)
    })
  }, [membership])

  const filtered = ranges.filter((r) => {
    if (filterPosition && r.context?.position !== filterPosition) return false
    if (filterVersus && r.context?.versus !== filterVersus) return false
    return true
  })

  const positions = [...new Set(ranges.map((r) => r.context?.position).filter(Boolean))]

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
        </div>

        <div style={styles.body}>
          <div style={styles.list}>
            {filtered.length === 0 && (
              <p style={styles.empty}>Aucune range sauvegardée.</p>
            )}
            {filtered.map((r) => (
              <button
                key={r.id}
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
            ))}
          </div>

          <div style={styles.preview}>
            {selected ? (
              <>
                <p style={styles.previewTitle}>{selected.name}</p>
                <RangeGrid overrideMatrix={selected.range} readOnly />
                {onUseRange && (
                  <button style={styles.useBtn} onClick={() => onUseRange(selected)}>
                    Utiliser cette range
                  </button>
                )}
              </>
            ) : (
              <p style={styles.empty}>Sélectionne une range pour la visualiser.</p>
            )}
          </div>
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
  closeBtn: { background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '18px' },
  filters: { display: 'flex', gap: '8px', padding: '12px 24px', borderBottom: '1px solid #222' },
  select: { padding: '8px 12px', borderRadius: '8px', border: '1px solid #333', backgroundColor: '#1a1a1a', color: 'white', fontSize: '13px', cursor: 'pointer', outline: 'none' },
  body: { display: 'flex', flex: 1, overflow: 'hidden' },
  list: { width: '240px', flexShrink: 0, borderRight: '1px solid #222', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto' },
  rangeBtn: { padding: '10px', borderRadius: '8px', border: '1px solid #333', backgroundColor: '#1a1a1a', cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '2px' },
  rangeName: { color: 'white', fontSize: '13px', fontWeight: 'bold' },
  rangeContext: { color: '#666', fontSize: '11px' },
  preview: { flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', overflowY: 'auto' },
  previewTitle: { color: 'white', fontSize: '16px', fontWeight: 'bold', margin: 0 },
  useBtn: { padding: '12px 24px', borderRadius: '8px', border: 'none', backgroundColor: '#22c55e', color: 'white', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' },
  empty: { color: '#444', fontSize: '13px', fontStyle: 'italic', margin: 0 },
}