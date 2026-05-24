/**
 * LibraryPage.jsx — Bibliothèque de ranges sauvegardées
 *
 * Affiche les ranges sauvegardées accessibles à l'utilisateur :
 * - Ses ranges personnelles (🔒)
 * - Les ranges partagées du groupe (👥)
 *
 * Fonctionnalités :
 * - Filtres par position, versus, visibilité
 * - Visualisation de la grille en cliquant sur une range
 * - Renommage (double-clic desktop, bouton ✏️ mobile)
 * - Suppression (selon les permissions)
 * - Chargement dans la session active ("Utiliser cette range")
 *
 * Permissions :
 * - Joueur : peut renommer et supprimer ses ranges personnelles uniquement
 * - Master : peut renommer et supprimer toutes les ranges du groupe
 *
 * Responsive :
 * - Desktop : liste à gauche + grille à droite
 * - Mobile : liste → clic → grille en plein écran avec bouton retour
 */

import { useEffect, useState } from 'react'
import { getSavedRanges, deleteRange, renameRange } from '../lib/session'
import RangeGrid from '../components/RangeGrid/RangeGrid'

export default function LibraryPage({ membership, onClose, onUseRange }) {
  const [ranges, setRanges] = useState([])
  const [selected, setSelected] = useState(null)
  const [filterPosition, setFilterPosition] = useState('')
  const [filterVersus, setFilterVersus] = useState('')
  const [filterVisibility, setFilterVisibility] = useState('')
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [editingId, setEditingId] = useState(null)     // ID de la range en cours de renommage
  const [editingName, setEditingName] = useState('')   // Nom temporaire pendant le renommage

  // ─── Responsive ───────────────────────────────────────────────────────────
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // ─── Chargement des ranges ────────────────────────────────────────────────
  useEffect(() => {
    if (!membership?.user_id || !membership?.group_id) return
    getSavedRanges(membership.user_id, membership.group_id).then(setRanges)
  }, [membership])

  /**
   * Supprime une range et met à jour l'état local.
   * Si la range supprimée est sélectionnée, désélectionne.
   */
  const handleDelete = async (r) => {
    await deleteRange(r.id)
    setRanges((prev) => prev.filter((x) => x.id !== r.id))
    if (selected?.id === r.id) setSelected(null)
  }

  /**
   * Valide le renommage d'une range.
   * Annule si le nom est vide ou identique.
   */
  const handleRename = async (r) => {
    if (!editingName.trim() || editingName === r.name) {
      setEditingId(null)
      return
    }
    await renameRange(r.id, editingName.trim())
    setRanges((prev) => prev.map((x) => x.id === r.id ? { ...x, name: editingName.trim() } : x))
    if (selected?.id === r.id) setSelected((s) => ({ ...s, name: editingName.trim() }))
    setEditingId(null)
  }

  /**
   * Vérifie si l'utilisateur peut supprimer une range.
   * - Master : peut tout supprimer
   * - Joueur : uniquement ses ranges personnelles
   */
  const canDelete = (r) => {
    if (membership.role === 'master') return true
    return r.user_id === membership.user_id && !r.is_shared
  }

  /**
   * Vérifie si l'utilisateur peut renommer une range.
   * - Master : peut tout renommer
   * - Joueur : uniquement ses propres ranges
   */
  const canRename = (r) => {
    if (membership.role === 'master') return true
    return r.user_id === membership.user_id
  }

  // ─── Filtrage ─────────────────────────────────────────────────────────────
  const filtered = ranges.filter((r) => {
    if (filterPosition && r.context?.position !== filterPosition) return false
    if (filterVersus && r.context?.versus !== filterVersus) return false
    if (filterVisibility === 'personal' && r.is_shared) return false
    if (filterVisibility === 'shared' && !r.is_shared) return false
    return true
  })

  // Positions disponibles pour le filtre (extraites des ranges existantes)
  const positions = [...new Set(ranges.map((r) => r.context?.position).filter(Boolean))]

  /**
   * Composant d'un élément de la liste de ranges.
   * Gère le renommage inline et le bouton de suppression.
   */
  const RangeItem = ({ r }) => (
    <div style={{ position: 'relative' }}>
      {editingId === r.id ? (
        // Mode renommage
        <div style={styles.renameRow}>
          <input
            style={styles.renameInput}
            value={editingName}
            onChange={(e) => setEditingName(e.target.value)}
            onBlur={() => handleRename(r)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename(r)
              if (e.key === 'Escape') setEditingId(null)
            }}
            autoFocus
          />
          <button style={styles.renameConfirmBtn} onClick={() => handleRename(r)}>✓</button>
        </div>
      ) : (
        // Mode affichage
        <button
          style={{
            ...styles.rangeBtn,
            borderColor: selected?.id === r.id ? '#22c55e' : '#333',
            color: selected?.id === r.id ? '#22c55e' : '#ccc',
          }}
          onClick={() => setSelected(r)}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span
              style={styles.rangeName}
              // Desktop : double-clic pour renommer
              onDoubleClick={(e) => {
                if (!canRename(r) || isMobile) return
                e.stopPropagation()
                setEditingId(r.id)
                setEditingName(r.name)
              }}
            >
              {r.name}
            </span>
            {/* Mobile : bouton ✏️ pour renommer */}
            {canRename(r) && isMobile && (
              <button
                style={styles.editBtn}
                onClick={(e) => {
                  e.stopPropagation()
                  setEditingId(r.id)
                  setEditingName(r.name)
                }}
              >
                ✏️
              </button>
            )}
          </div>
          <span style={styles.rangeContext}>
            {r.context?.position} · {r.context?.stackSize}BB · {r.context?.versus === 'fish' ? 'Fish' : 'Reg'}
            {r.is_shared ? ' · 👥' : ' · 🔒'}
          </span>
        </button>
      )}
      {/* Bouton suppression (affiché si permission) */}
      {canDelete(r) && editingId !== r.id && (
        <button
          style={styles.deleteBtn}
          onClick={(e) => { e.stopPropagation(); handleDelete(r) }}
        >
          🗑️
        </button>
      )}
    </div>
  )

  // ─── Vue mobile : grille sélectionnée ─────────────────────────────────────
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
              {canRename(selected) && (
                <button style={styles.renameBtnLarge} onClick={() => {
                  setSelected(null)
                  setEditingId(selected.id)
                  setEditingName(selected.name)
                }}>
                  ✏️ Renommer
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

  // ─── Vue principale (desktop + liste mobile) ───────────────────────────────
  return (
    <div style={styles.overlay}>
      <div style={styles.container}>
        <div style={styles.header}>
          <h2 style={styles.title}>📚 Bibliothèque de ranges</h2>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Filtres */}
        <div style={styles.filters}>
          <select style={styles.select} value={filterPosition} onChange={(e) => setFilterPosition(e.target.value)}>
            <option value="">Toutes positions</option>
            {positions.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select style={styles.select} value={filterVersus} onChange={(e) => setFilterVersus(e.target.value)}>
            <option value="">Reg + Fish</option>
            <option value="reg">Reg</option>
            <option value="fish">Fish</option>
          </select>
          <select style={styles.select} value={filterVisibility} onChange={(e) => setFilterVisibility(e.target.value)}>
            <option value="">Toutes</option>
            <option value="personal">🔒 Personnelles</option>
            <option value="shared">👥 Partagées</option>
          </select>
        </div>

        <div style={isMobile ? styles.bodyMobile : styles.body}>
          {/* Liste des ranges */}
          <div style={isMobile ? styles.listMobile : styles.list}>
            {filtered.length === 0 && <p style={styles.empty}>Aucune range sauvegardée.</p>}
            {filtered.map((r) => <RangeItem key={r.id} r={r} />)}
          </div>

          {/* Aperçu de la grille (desktop uniquement) */}
          {!isMobile && (
            <div style={styles.preview}>
              {selected ? (
                <>
                  <p style={styles.previewTitle}>{selected.name}</p>
                  <RangeGrid overrideMatrix={selected.range} readOnly compact />
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    {onUseRange && (
                      <button style={styles.useBtn} onClick={() => onUseRange(selected)}>
                        Utiliser cette range
                      </button>
                    )}
                    {canRename(selected) && (
                      <button style={styles.renameBtnLarge} onClick={() => {
                        setEditingId(selected.id)
                        setEditingName(selected.name)
                        setSelected(null)
                      }}>
                        ✏️ Renommer
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
  renameRow: { display: 'flex', gap: '6px', alignItems: 'center', padding: '10px', borderRadius: '8px', border: '1px solid #22c55e', backgroundColor: '#1a1a1a' },
  renameInput: { flex: 1, backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid #22c55e', color: 'white', fontSize: '13px', fontWeight: 'bold', outline: 'none', padding: '0 0 2px 0' },
  renameConfirmBtn: { background: 'transparent', border: 'none', color: '#22c55e', cursor: 'pointer', fontSize: '16px', padding: '0 4px' },
  editBtn: { background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '12px', padding: '0 4px', opacity: 0.6 },
  deleteBtn: { position: 'absolute', top: '6px', right: '6px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '14px', opacity: 0.5 },
  preview: { flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', overflowY: 'auto' },
  previewTitle: { color: 'white', fontSize: '16px', fontWeight: 'bold', margin: 0 },
  previewContextMobile: { color: '#666', fontSize: '12px', margin: 0, textAlign: 'center', padding: '4px 24px' },
  useBtn: { padding: '12px 24px', borderRadius: '8px', border: 'none', backgroundColor: '#22c55e', color: 'white', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' },
  renameBtnLarge: { padding: '12px 24px', borderRadius: '8px', border: '1px solid #f59e0b', backgroundColor: 'transparent', color: '#f59e0b', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' },
  deleteBtnLarge: { padding: '12px 24px', borderRadius: '8px', border: '1px solid #ef4444', backgroundColor: 'transparent', color: '#ef4444', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' },
  empty: { color: '#444', fontSize: '13px', fontStyle: 'italic', margin: 0 },
}