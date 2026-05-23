import { create } from 'zustand'
import { generateMatrix } from '../components/RangeGrid/rangeMatrix'
import { ACTIONS } from '../data/actions'
import { saveRange, saveContext } from '../lib/session'

export const useRangeStore = create((set, get) => ({
  matrix: generateMatrix(),
  selectedAction: ACTIONS[1],
  position: 'BTN',
  stackSize: '100',
  situation: 'OPEN',
  versus: 'reg',
  playerId: null,
  activePlayerId: null,

  reset: () => set({
    matrix: generateMatrix(),
    selectedAction: ACTIONS[1],
    position: 'BTN',
    stackSize: '100',
    situation: 'OPEN',
    versus: 'reg',
    playerId: null,
    activePlayerId: null,
  }),

  setPlayerId: (id) => set({ playerId: id, activePlayerId: id }),
  setActivePlayerId: (id) => set({ activePlayerId: id }),
  setSelectedAction: (action) => set({ selectedAction: action }),

  setPosition: (position) => {
    set({ position })
    const { activePlayerId, stackSize, versus } = get()
    if (activePlayerId) saveContext(activePlayerId, { position, stackSize, versus })
  },

  setStackSize: (stackSize) => {
    set({ stackSize })
    const { activePlayerId, position, versus } = get()
    if (activePlayerId) saveContext(activePlayerId, { position, stackSize, versus })
  },

  setVersus: async (versus, playerData) => {
  const { activePlayerId, matrix, position, stackSize, versus: currentVersus } = get()

  if (activePlayerId && currentVersus !== versus) {
    await saveRange(activePlayerId, matrix, currentVersus)
  }

  const newMatrix = versus === 'fish'
    ? (playerData?.range_fish?.length > 0 ? playerData.range_fish : generateMatrix())
    : (playerData?.range_reg?.length > 0 ? playerData.range_reg : generateMatrix())

  set({ versus, matrix: newMatrix })
  if (activePlayerId) saveContext(activePlayerId, { position, stackSize, versus })
},

  setPositionSilent: (position) => set({ position }),
  setStackSizeSilent: (stackSize) => set({ stackSize }),
  setVersusSilent: (versus) => set({ versus }),

  setSituation: (situation) => set({ situation }),
  setMatrix: (matrix) => set({ matrix }),

  clearMatrix: () => {
    const matrix = generateMatrix()
    set({ matrix })
    const { activePlayerId, versus } = get()
    if (activePlayerId) saveRange(activePlayerId, matrix, versus)
  },

  setPreset: (handLabels, actionId) =>
    set((state) => {
      const action = ACTIONS.find((a) => a.id === actionId)
      if (!action) return {}
      const matrix = state.matrix.map((row) =>
        row.map((cell) => ({
          ...cell,
          actions: handLabels.includes(cell.label)
            ? [{ type: action.id, frequency: 100, color: action.color }]
            : [],
        }))
      )
      if (state.activePlayerId) saveRange(state.activePlayerId, matrix, state.versus)
      return { matrix }
    }),

  updateCell: (rowIndex, colIndex) =>
    set((state) => {
      const matrix = state.matrix.map((row) =>
        row.map((cell) => ({ ...cell, actions: [...cell.actions] }))
      )
      const cell = matrix[rowIndex][colIndex]
      const existing = cell.actions.find((a) => a.type === state.selectedAction.id)
      if (existing) {
        existing.frequency += 25
        if (existing.frequency > 100) {
          cell.actions = cell.actions.filter((a) => a.type !== state.selectedAction.id)
        }
      } else {
        cell.actions.push({
          type: state.selectedAction.id,
          frequency: 100,
          color: state.selectedAction.color,
        })
      }
      normalizeFrequencies(cell)
      if (state.activePlayerId) saveRange(state.activePlayerId, matrix, state.versus)
      return { matrix }
    }),
}))

function normalizeFrequencies(cell) {
  const total = cell.actions.reduce((sum, a) => sum + a.frequency, 0)
  if (total <= 100) return
  const ratio = 100 / total
  cell.actions = cell.actions.map((a) => ({
    ...a,
    frequency: Math.round(a.frequency * ratio),
  }))
}