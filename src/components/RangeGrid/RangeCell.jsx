export default function RangeCell({ cell, onClick }) {
  return (
    <button
      onClick={onClick}
      className="aspect-square border border-slate-800 text-[9px] sm:text-xs font-bold text-white relative overflow-hidden"
      style={{
        background: buildGradient(cell.actions),
      }}
    >
      {cell.hand}
    </button>
  )
}

function buildGradient(actions) {
  if (!actions.length) {
    return '#111827'
  }

  let current = 0

  const segments = actions.map((action) => {
    const start = current
    const end = current + action.frequency

    current = end

    return `${action.color} ${start}%, ${action.color} ${end}%`
  })

  return `linear-gradient(to bottom, ${segments.join(', ')})`
}