/**
 * RangeGrid.jsx — Grille 13x13 avec support du drag select
 *
 * Gère la sélection par glissement (souris et tactile) :
 * - mousedown/touchstart : démarre le drag
 * - mousemove/touchmove : ajoute les cellules survolées
 * - mouseup/touchend : applique l'action sur toutes les cellules sélectionnées
 *
 * Sur mobile, un tap simple (1 cellule) applique l'action immédiatement.
 * Utilise une ref pour tracker les cellules (évite les problèmes de closure avec le state).
 */

import { useRangeStore } from '../../stores/rangeStore'
import RangeCell from './RangeCell'
import { useState, useEffect, useRef, useCallback } from 'react'

export default function RangeGrid({ overrideMatrix, readOnly, compact }) {
  const matrix = useRangeStore((state) => state.matrix)
  const updateCell = useRangeStore((state) => state.updateCell)
  const [windowWidth, setWindowWidth] = useState(window.innerWidth)
  const [windowHeight, setWindowHeight] = useState(window.innerHeight)

  // ─── Drag select ──────────────────────────────────────────────────────────
  const [isDragging, setIsDragging] = useState(false)
  const [draggedCells, setDraggedCells] = useState(new Set())
  const draggedCellsRef = useRef(new Set()) // Ref pour accès synchrone dans les handlers

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth)
      setWindowHeight(window.innerHeight)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Arrête le drag quand on relâche la souris n'importe où sur la page
  useEffect(() => {
    const handleMouseUp = () => {
      if (isDragging) endDrag()
    }
    window.addEventListener('mouseup', handleMouseUp)
    return () => window.removeEventListener('mouseup', handleMouseUp)
  }, [isDragging])

  const displayMatrix = overrideMatrix ?? matrix
  if (!displayMatrix) return null

  const isMobile = windowWidth < 768
  const isLandscape = windowWidth > windowHeight

  let cellSize
  if (compact) {
    const availableWidth = Math.min(windowWidth - 32, 500)
    const availableHeight = windowHeight - 200
    const sizeByWidth = Math.floor((availableWidth - 12 * 6 - 20) / 13)
    const sizeByHeight = Math.floor((availableHeight - 12 * 6 - 20) / 13)
    cellSize = Math.min(sizeByWidth, sizeByHeight, 48)
    cellSize = Math.max(cellSize, 20)
  } else if (isMobile) {
    cellSize = isLandscape ? 32 : 24
  } else {
    const gridCount = overrideMatrix !== undefined ? 2 : 1
    const availableWidth = (windowWidth - 180 - 80) / gridCount - (gridCount > 1 ? 20 : 0)
    const availableHeight = windowHeight - 140
    const sizeByWidth = Math.floor((availableWidth - 12 * 6 - 20) / 13)
    const sizeByHeight = Math.floor((availableHeight - 12 * 6 - 20) / 13)
    cellSize = Math.min(sizeByWidth, sizeByHeight)
    cellSize = Math.min(cellSize, 72)
    cellSize = Math.max(cellSize, 28)
  }

  /** Démarre le drag sur une cellule */
  const startDrag = (i, j) => {
    if (readOnly) return
    draggedCellsRef.current = new Set([`${i}-${j}`])
    setIsDragging(true)
    setDraggedCells(new Set([`${i}-${j}`]))
  }

  /** Ajoute une cellule au drag — met à jour ref ET state */
  const addToDrag = (i, j) => {
    if (!isDragging || readOnly) return
    draggedCellsRef.current.add(`${i}-${j}`)
    setDraggedCells(new Set(draggedCellsRef.current))
  }

  /** Applique l'action sur toutes les cellules via la ref (toujours à jour) */
  const endDrag = () => {
    if (!isDragging) return
    draggedCellsRef.current.forEach((key) => {
      const [i, j] = key.split('-').map(Number)
      updateCell(i, j)
    })
    draggedCellsRef.current = new Set()
    setIsDragging(false)
    setDraggedCells(new Set())
  }

  /**
   * Détecte la cellule sous le doigt lors d'un touchmove.
   * Utilise elementFromPoint pour trouver l'élément sous le doigt
   * et remonte dans le DOM jusqu'à trouver data-cell.
   */
  const handleTouchMove = useCallback((e) => {
    if (!isDragging || readOnly) return
    e.preventDefault()
    const touch = e.touches[0]
    const element = document.elementFromPoint(touch.clientX, touch.clientY)
    if (!element) return

    let target = element
    while (target && !target.dataset.cell) {
      target = target.parentElement
    }
    if (target?.dataset.cell) {
      const [i, j] = target.dataset.cell.split('-').map(Number)
      draggedCellsRef.current.add(`${i}-${j}`)
      setDraggedCells(new Set(draggedCellsRef.current))
    }
  }, [isDragging, readOnly])

  /**
   * Sur mobile :
   * - 1 cellule → tap simple → applique immédiatement via la ref
   * - N cellules → drag → applique sur toutes
   */
  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return
    const cells = draggedCellsRef.current

    cells.forEach((key) => {
      const [i, j] = key.split('-').map(Number)
      updateCell(i, j)
    })

    draggedCellsRef.current = new Set()
    setIsDragging(false)
    setDraggedCells(new Set())
  }, [isDragging])

  return (
    <div
      style={styles.wrapper}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        style={{
          ...styles.grid,
          gridTemplateColumns: `repeat(13, ${cellSize}px)`,
          gap: isMobile ? '3px' : '6px',
          userSelect: 'none',
        }}
      >
        {displayMatrix.map((row, i) =>
          row.map((cell, j) => (
            <RangeCell
              key={`${i}-${j}`}
              cell={cell}
              cellSize={cellSize}
              isDragged={draggedCells.has(`${i}-${j}`)}
              onMouseDown={readOnly ? undefined : () => startDrag(i, j)}
              onMouseEnter={readOnly ? undefined : () => addToDrag(i, j)}
              onTouchStart={readOnly ? undefined : () => startDrag(i, j)}
              dataCell={`${i}-${j}`}
            />
          ))
        )}
      </div>
    </div>
  )
}

const styles = {
  wrapper: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  grid: {
    display: 'grid',
    backgroundColor: '#111',
    padding: '10px',
    borderRadius: '12px',
    width: 'fit-content',
  },
}