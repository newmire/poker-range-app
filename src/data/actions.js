/**
 * actions.js — Définition des actions disponibles dans l'application
 *
 * Chaque action représente une décision de poker pouvant être appliquée
 * à une combinaison de mains dans la grille de range.
 *
 * Structure d'une action :
 * - id : identifiant unique utilisé dans le store et la base de données
 * - label : texte affiché dans la barre d'actions
 * - color : couleur CSS utilisée pour colorier les cellules de la grille
 *
 * Ordre d'affichage dans la BottomActionBar (FOLD exclu) :
 * Call → Raise → 3Bet → 4Bet → All In
 *
 * Note : FOLD est défini mais filtré dans BottomActionBar
 * (non pertinent dans le contexte d'une session de review de range).
 * Il reste disponible dans le système au cas où il serait utile plus tard.
 *
 * Couleurs choisies pour maximiser la lisibilité et la distinction visuelle :
 * - Call  : vert  (#22c55e) — action passive
 * - Raise : bleu  (#3b82f6) — action agressive standard
 * - 3Bet  : orange (#f97316) — relance de relance
 * - 4Bet  : rouge (#ef4444) — relance très agressive
 * - All In : violet (#a855f7) — mise totale
 * - Fold  : gris  (#6b7280) — abandon
 */

export const ACTIONS = [
  {
    id: 'FOLD',
    label: 'Fold',
    color: '#6b7280', // Gris
  },
  {
    id: 'CALL',
    label: 'Call',
    color: '#22c55e', // Vert
  },
  {
    id: 'RAISE',
    label: 'Raise',
    color: '#3b82f6', // Bleu
  },
  {
    id: 'THREE_BET',
    label: '3Bet',
    color: '#f97316', // Orange
  },
  {
    id: 'FOUR_BET',
    label: '4Bet',
    color: '#ef4444', // Rouge
  },
  {
    id: 'ALL_IN',
    label: 'All In',
    color: '#a855f7', // Violet
  },
]