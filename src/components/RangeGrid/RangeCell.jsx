/**
 * RangeCell.jsx — Cellule individuelle de la grille de range
 *
 * Supporte le drag select via les props onMouseDown, onMouseEnter, onTouchStart.
 * La prop isDragged permet de mettre en évidence les cellules survolées pendant le drag.
 *
 * Props :
 * - cell : { label, value, actions }
 * - cellSize : taille en pixels
 * - isDragged : true si la cellule est dans la sélection en cours
 * - onMouseDown : démarre le drag (desktop)
 * - onMouseEnter : ajoute la cellule au drag (desktop)
 * - onTouchStart : démarre le drag (mobile)
 * - dataCell : attribut data-cell pour la détection tactile via elementFromPoint
 */

export default function RangeCell({ cell, cellSize, isDragged, onMouseDown, onMouseEnter, onTouchStart, dataCell }) {
  const hasActions = cell.actions.length > 0
  const isPair = cell.label.length === 2 && cell.label[0] === cell.label[1]

  return (
    <div
      data-cell={dataCell}
      onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter}
      onTouchStart={onTouchStart}
      style={{
        width: cellSize,
        height: cellSize,
        borderRadius: '4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: '600',
        fontSize: Math.max(7, cellSize * 0.28),
        cursor: onMouseDown ? 'pointer' : 'default',
        userSelect: 'none',
        transition: isDragged ? 'none' : '0.15s',
        background: isDragged
          ? 'rgba(255,255,255,0.25)' // Highlight pendant le drag
          : buildGradient(cell.actions),
        color: hasActions ? '#fff' : '#aaa',
        border: isPair
          ? '2px solid #f59e0b'
          : hasActions
          ? 'none'
          : '1px solid #333',
        // Légère mise en évidence si survolé pendant le drag
        outline: isDragged ? '2px solid rgba(255,255,255,0.5)' : 'none',
        outlineOffset: '-2px',
      }}
    >
      {cell.label}
    </div>
  )
}

/**
 * Construit le background CSS selon les actions de la cellule.
 *
 * @param {array} actions - [{ color, frequency }]
 * @returns {string} Valeur CSS background
 */
function buildGradient(actions) {
  if (!actions.length) return '#1e1e1e'
  if (actions.length === 1) return actions[0].color

  let current = 0
  const segments = actions.map((action) => {
    const start = current
    const end = current + action.frequency
    current = end
    return `${action.color} ${start}%, ${action.color} ${end}%`
  })

  return `linear-gradient(to bottom, ${segments.join(', ')})`
}