import React from "react";

export default function RangeGrid({ rangeMatrix, setRangeMatrix }) {
  if (!rangeMatrix) return null;

  const toggleCell = (i, j) => {
    const updated = rangeMatrix.map((row, r) =>
      row.map((cell, c) => {
        if (r === i && c === j) {
          return {
            ...cell,
            value: cell.value === 1 ? 0 : 1,
          };
        }
        return cell;
      })
    );

    setRangeMatrix(updated);
  };

  const isMobile =
    typeof window !== "undefined" && window.innerWidth < 768;

  const isLandscape =
    typeof window !== "undefined" &&
    window.innerWidth > window.innerHeight;

  // 🎯 SEULE VRAIE LOGIQUE IMPORTANTE
  const cellSize = isMobile ? (isLandscape ? 32 : 24) : 42;

  return (
    <div style={styles.wrapper}>
      <div
        style={{
          ...styles.grid,
          gridTemplateColumns: `repeat(13, ${cellSize}px)`,
          gap: isMobile ? "3px" : "6px",
        }}
      >
        {rangeMatrix.map((row, i) =>
          row.map((cell, j) => {
            const active = cell.value === 1;

            return (
              <div
                key={`${i}-${j}`}
                onClick={() => toggleCell(i, j)}
                style={{
                  ...styles.cell,
                  width: cellSize,
                  height: cellSize,
                  fontSize: Math.max(7, cellSize * 0.28),
                  backgroundColor: active ? "#22c55e" : "#2a2a2a",
                  color: active ? "#000" : "#aaa",
                }}
              >
                {cell.label}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },

  grid: {
    display: "grid",
    backgroundColor: "#111",
    padding: "10px",
    borderRadius: "12px",
    width: "fit-content", // 🔥 IMPORTANT POUR ÉVITER COUPURE
  },

  cell: {
    borderRadius: "4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "600",
    cursor: "pointer",
    userSelect: "none",
    transition: "0.15s",
  },
};