import { useRangeStore } from '../../stores/rangeStore'
import RangeCell from './RangeCell'
import { useState, useEffect } from 'react'

export default function RangeGrid({ overrideMatrix, readOnly, compact }) {
  const matrix = useRangeStore((state) => state.matrix)
  const updateCell = useRangeStore((state) => state.updateCell)
  const [windowWidth, setWindowWidth] = useState(window.innerWidth)
  const [windowHeight, setWindowHeight] = useState(window.innerHeight)

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth)
      setWindowHeight(window.innerHeight)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

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

  return (
    <div style={styles.wrapper}>
      <div
        style={{
          ...styles.grid,
          gridTemplateColumns: `repeat(13, ${cellSize}px)`,
          gap: isMobile ? '3px' : '6px',
        }}
      >
        {displayMatrix.map((row, i) =>
          row.map((cell, j) => (
            <RangeCell
              key={`${i}-${j}`}
              cell={cell}
              cellSize={cellSize}
              onClick={readOnly ? undefined : () => updateCell(i, j)}
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