/**
 * rangeMatrix.js — Générateur de la matrice 13x13 des combinaisons de mains
 *
 * La grille de range poker est une matrice 13x13 où :
 * - Les lignes et colonnes représentent les 13 rangs (As à 2)
 * - La diagonale contient les paires (AA, KK, QQ...)
 * - Le triangle supérieur droit contient les mains suited (AKs, AQs...)
 * - Le triangle inférieur gauche contient les mains offsuit (AKo, AQo...)
 *
 * Chaque cellule contient :
 * - label : nom de la main (ex: 'AKs', 'QQ', 'T9o')
 * - value : valeur numérique (non utilisée actuellement)
 * - actions : tableau des actions appliquées à cette main
 *   [{ type: 'RAISE', frequency: 100, color: '#3b82f6' }]
 */

const ranks = [
  'A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'
]

/**
 * Génère une matrice 13x13 vierge.
 * Appelée à l'initialisation du store et lors d'un Clear.
 *
 * Logique de construction :
 * - i === j (diagonale) → paire : 'AA', 'KK'...
 * - i < j (triangle haut) → suited : 'AKs', 'AQs'... (rang ligne + rang colonne + 's')
 * - i > j (triangle bas) → offsuit : 'AKo', 'AQo'... (rang colonne + rang ligne + 'o')
 *
 * @returns {array} Matrice 13x13 de cellules vierges
 */
export function generateMatrix() {
  const matrix = []

  for (let i = 0; i < ranks.length; i++) {
    const row = []

    for (let j = 0; j < ranks.length; j++) {
      const r1 = ranks[i]
      const r2 = ranks[j]

      let label = ''

      if (i === j) {
        // Diagonale : paire
        label = r1 + r2
      } else if (i < j) {
        // Triangle supérieur : suited (la carte la plus haute en premier)
        label = r1 + r2 + 's'
      } else {
        // Triangle inférieur : offsuit (la carte la plus haute en premier)
        label = r2 + r1 + 'o'
      }

      row.push({
        label,
        value: 0,
        actions: [], // Aucune action par défaut (cellule vide)
      })
    }

    matrix.push(row)
  }

  return matrix
}