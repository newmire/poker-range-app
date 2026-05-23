export default function RangeCell({ cell, cellSize, onClick }) {
  const hasActions = cell.actions.length > 0
  const isPair = cell.label.length === 2 && cell.label[0] === cell.label[1]

  return (
    <div
      onClick={onClick}
      style={{
        width: cellSize,
        height: cellSize,
        borderRadius: '4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: '600',
        fontSize: Math.max(7, cellSize * 0.28),
        cursor: 'pointer',
        userSelect: 'none',
        transition: '0.15s',
        background: buildGradient(cell.actions),
        color: hasActions ? '#fff' : '#aaa',
        border: isPair
          ? '2px solid #f59e0b'
          : hasActions
          ? 'none'
          : '1px solid #333',
      }}
    >
      {cell.label}
    </div>
  )
}

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