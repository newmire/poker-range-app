import { ACTIONS } from '../../data/actions'
import { useRangeStore } from '../../stores/rangeStore'

export default function BottomActionBar() {
  const selectedAction = useRangeStore((state) => state.selectedAction)
  const setSelectedAction = useRangeStore((state) => state.setSelectedAction)

  const isMobile = window.innerWidth < 768
  const isPortrait = window.innerHeight > window.innerWidth

  return (
    <div style={{
      ...styles.bar,
      padding: isMobile && isPortrait ? '8px 6px' : '10px 16px',
      gap: isMobile && isPortrait ? '4px' : '10px',
    }}>
      {ACTIONS.filter((a) => a.id !== 'FOLD').map((action) => (
        <button
          key={action.id}
          onClick={() => setSelectedAction(action)}
          style={{
            ...styles.button,
            padding: isMobile && isPortrait ? '8px 4px' : '10px 20px',
            fontSize: isMobile && isPortrait ? '11px' : '14px',
            borderRadius: isMobile && isPortrait ? '8px' : '10px',
            background: action.color,
            outline: selectedAction.id === action.id ? '3px solid white' : 'none',
            outlineOffset: '2px',
            opacity: selectedAction.id === action.id ? 1 : 0.6,
            transform: selectedAction.id === action.id ? 'scale(1.05)' : 'scale(1)',
          }}
        >
          {action.label}
        </button>
      ))}
    </div>
  )
}

const styles = {
  bar: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0f0f0f',
    borderTop: '1px solid #222',
    display: 'flex',
    justifyContent: 'center',
    zIndex: 100,
  },
  button: {
    border: 'none',
    color: 'white',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.15s',
    flex: '1 1 0',
    maxWidth: '120px',
  },
}