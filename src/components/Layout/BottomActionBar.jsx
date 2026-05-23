import { ACTIONS } from '../../data/actions'
import { useRangeStore } from '../../stores/rangeStore'

export default function BottomActionBar() {
  const selectedAction = useRangeStore((state) => state.selectedAction)

  const setSelectedAction = useRangeStore(
    (state) => state.setSelectedAction
  )

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-700 p-2 flex gap-2 overflow-x-auto">
      {ACTIONS.map((action) => (
        <button
          key={action.id}
          onClick={() => setSelectedAction(action)}
          className={`px-4 py-3 rounded-xl whitespace-nowrap font-bold text-white min-w-fit ${
            selectedAction.id === action.id
              ? 'ring-2 ring-white'
              : ''
          }`}
          style={{
            background: action.color,
          }}
        >
          {action.label}
        </button>
      ))}
    </div>
  )
}