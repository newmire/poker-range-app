/**
 * rangeStore.js — Store Zustand global de l'application
 *
 * Contient tout l'état lié à la range en cours d'édition :
 * - La matrice 13x13
 * - L'action sélectionnée (Call, Raise, etc.)
 * - Le contexte (position, BB, versus)
 * - Les IDs du joueur actif
 *
 * Toutes les modifications de range déclenchent une sauvegarde
 * automatique vers Supabase via saveRange et saveContext.
 */

import { create } from 'zustand'
import { generateMatrix } from '../components/RangeGrid/rangeMatrix'
import { ACTIONS } from '../data/actions'
import { saveRange, saveContext } from '../lib/session'

export const useRangeStore = create((set, get) => ({
  // ─── État ─────────────────────────────────────────────────────────────────

  matrix: generateMatrix(),        // Matrice 13x13 des combinaisons de mains
  selectedAction: ACTIONS[1],      // Action active (Call par défaut)
  position: 'BTN',                 // Position à la table
  stackSize: '100',                // Profondeur en BB
  situation: 'OPEN',               // Situation (non utilisé pour l'instant)
  versus: 'reg',                   // Adversaire : 'reg' ou 'fish'
  playerId: null,                  // ID du joueur connecté (ne change jamais en session)
  activePlayerId: null,            // ID du joueur dont on édite la range (peut changer si master)

  // ─── Actions de base ──────────────────────────────────────────────────────

  /** Définit l'ID du joueur connecté et initialise activePlayerId */
  setPlayerId: (id) => set({ playerId: id, activePlayerId: id }),

  /** Permet au master de changer le joueur actif (celui dont on édite la range) */
  setActivePlayerId: (id) => set({ activePlayerId: id }),

  /** Change l'action sélectionnée dans la barre d'actions */
  setSelectedAction: (action) => set({ selectedAction: action }),

  /** Change la situation (non utilisé actuellement) */
  setSituation: (situation) => set({ situation }),

  /** Remplace toute la matrice (ex: chargement d'une range externe) */
  setMatrix: (matrix) => set({ matrix }),

  // ─── Contexte avec sauvegarde Supabase ────────────────────────────────────

  /**
   * Change la position et sauvegarde le contexte en base.
   * Utilise activePlayerId pour savoir sur quel joueur sauvegarder.
   */
  setPosition: (position) => {
    set({ position })
    const { activePlayerId, stackSize, versus } = get()
    if (activePlayerId) saveContext(activePlayerId, { position, stackSize, versus })
  },

  /**
   * Change la profondeur (BB) et sauvegarde le contexte en base.
   */
  setStackSize: (stackSize) => {
    set({ stackSize })
    const { activePlayerId, position, versus } = get()
    if (activePlayerId) saveContext(activePlayerId, { position, stackSize, versus })
  },

  // ─── Setters silencieux (sans sauvegarde Supabase) ────────────────────────
  // Utilisés quand le master consulte la range d'un joueur —
  // on met à jour l'affichage sans écrire en base.

  setPositionSilent: (position) => set({ position }),
  setStackSizeSilent: (stackSize) => set({ stackSize }),
  setVersusSilent: (versus) => set({ versus }),

  // ─── Reset complet ────────────────────────────────────────────────────────

  /**
   * Remet le store à son état initial.
   * Appelé quand l'utilisateur quitte une session.
   */
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

  // ─── Manipulation de la matrice ───────────────────────────────────────────

  /**
   * Remet la matrice à zéro et sauvegarde en base.
   */
  clearMatrix: () => {
    const matrix = generateMatrix()
    set({ matrix })
    const { activePlayerId, versus } = get()
    if (activePlayerId) saveRange(activePlayerId, matrix, versus)
  },

  /**
   * Applique un preset de mains (ex: range UTG) avec une action donnée.
   * Les mains dans handLabels reçoivent l'action à 100%, les autres sont vidées.
   *
   * @param {string[]} handLabels - Liste des labels de mains (ex: ['AA', 'AKs'])
   * @param {string} actionId - ID de l'action (ex: 'RAISE')
   */
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

  /**
   * Gère le clic sur une cellule de la grille.
   *
   * Comportement :
   * - Si l'action n'existe pas sur la cellule → ajout à 100%
   * - Si elle existe → +25% de fréquence
   * - Si fréquence > 100% → suppression de l'action
   *
   * Après modification, normalise les fréquences si le total dépasse 100%.
   *
   * @param {number} rowIndex - Index de la ligne (0-12)
   * @param {number} colIndex - Index de la colonne (0-12)
   */
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
          // Supprime l'action si elle dépasse 100%
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

/**
 * Normalise les fréquences des actions d'une cellule pour que leur total ne dépasse pas 100%.
 * Appelée après chaque modification de cellule.
 *
 * @param {object} cell - Cellule de la matrice
 */
function normalizeFrequencies(cell) {
  const total = cell.actions.reduce((sum, a) => sum + a.frequency, 0)
  if (total <= 100) return
  const ratio = 100 / total
  cell.actions = cell.actions.map((a) => ({
    ...a,
    frequency: Math.round(a.frequency * ratio),
  }))
}