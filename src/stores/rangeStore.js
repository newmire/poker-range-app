import { create } from 'zustand'
import { generateMatrix } from '../components/RangeGrid/rangeMatrix'
import { ACTIONS } from '../data/actions'

export const useRangeStore = create((set) => ({
  matrix: generateMatrix(),

  selectedAction: ACTIONS[1],

  setSelectedAction: (action) =>
    set({
      selectedAction: action,
    }),

  updateCell: (rowIndex, colIndex) =>
    set((state) => {
      const matrix = [...state.matrix]

      const cell = matrix[rowIndex][colIndex]

      const existing = cell.actions.find(
        (a) => a.type === state.selectedAction.id
      )

      if (existing) {
        existing.frequency += 25

        if (existing.frequency > 100) {
          existing.frequency = 25
        }
      } else {
        cell.actions.push({
          type: state.selectedAction.id,
          frequency: 100,
          color: state.selectedAction.color,
        })
      }

      normalizeFrequencies(cell)

      return {
        matrix: [...matrix],
      }
    }),
}))

function normalizeFrequencies(cell) {
  const total = cell.actions.reduce(
    (sum, action) => sum + action.frequency,
    0
  )

  if (total <= 100) return

  const ratio = 100 / total

  cell.actions = cell.actions.map((action) => ({
    ...action,
    frequency: Math.round(action.frequency * ratio),
  }))
}