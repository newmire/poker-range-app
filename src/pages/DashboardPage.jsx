import { useState } from "react";
import RangeGrid from "../components/RangeGrid/RangeGrid";
import { generateMatrix } from "../components/RangeGrid/rangeMatrix";

export default function DashboardPage() {
  const [rangeMatrix, setRangeMatrix] = useState(generateMatrix());

  // 🔥 CLEAR
  const clear = () => {
    setRangeMatrix(generateMatrix());
  };

  // 🔥 RANDOM (simple version)
  const random = () => {
    const updated = rangeMatrix.map(row =>
      row.map(cell => ({
        ...cell,
        value: Math.random() > 0.85 ? 1 : 0
      }))
    );
    setRangeMatrix(updated);
  };

  // 🔥 PRESET UTG (tight)
  const presetUTG = () => {
    const updated = rangeMatrix.map(row =>
      row.map(cell => {
        const strongHands = ["AA","KK","QQ","JJ","AKs","AKo","AQs","AQo","TT","99"];

        return {
          ...cell,
          value: strongHands.includes(cell.label) ? 1 : 0
        };
      })
    );
    setRangeMatrix(updated);
  };

  // 🔥 PRESET BTN (large)
  const presetBTN = () => {
    const updated = rangeMatrix.map(row =>
      row.map(cell => {
        const playable = [
          "AA","KK","QQ","JJ","TT","99","88","77","66","55","44","33","22",
          "AKs","AQs","AJs","ATs","A9s","A8s","A5s",
          "AKo","AQo","AJo","KQs","KJs","QJs","JTs","T9s"
        ];

        return {
          ...cell,
          value: playable.includes(cell.label) ? 1 : 0
        };
      })
    );
    setRangeMatrix(updated);
  };

  // 🔥 3BET SIMPLE (value hands)
  const preset3Bet = () => {
    const updated = rangeMatrix.map(row =>
      row.map(cell => {
        const range = ["AA","KK","QQ","JJ","AKs","AKo","AQs"];

        return {
          ...cell,
          value: range.includes(cell.label) ? 1 : 0
        };
      })
    );
    setRangeMatrix(updated);
  };

  // 🔥 4BET VERY STRONG
  const preset4Bet = () => {
    const updated = rangeMatrix.map(row =>
      row.map(cell => {
        const range = ["AA","KK","QQ","AKs","AKo"];

        return {
          ...cell,
          value: range.includes(cell.label) ? 1 : 0
        };
      })
    );
    setRangeMatrix(updated);
  };

  return (
    <div style={styles.page}>

      {/* SIDEBAR */}
      <div style={styles.sidebar}>
        <h3 style={styles.title}>Ranges</h3>

        <button style={styles.button} onClick={clear}>Clear</button>
        <button style={styles.button} onClick={random}>Random</button>

        <hr style={{ width: "100%", opacity: 0.2 }} />

        <button style={styles.button} onClick={presetUTG}>UTG</button>
        <button style={styles.button} onClick={presetBTN}>BTN</button>

        <hr style={{ width: "100%", opacity: 0.2 }} />

        <button style={styles.button} onClick={preset3Bet}>3-Bet</button>
        <button style={styles.button} onClick={preset4Bet}>4-Bet</button>
      </div>

      {/* GRID */}
      <RangeGrid
        rangeMatrix={rangeMatrix}
        setRangeMatrix={setRangeMatrix}
      />

    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#0a0a0a",
    display: "flex",
    gap: "20px",
    padding: "16px",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "flex-start",
  },

  sidebar: {
    width: "180px",
    backgroundColor: "#111",
    padding: "12px",
    borderRadius: "12px",
    border: "1px solid #222",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },

  title: {
    color: "white",
    fontSize: "14px",
    marginBottom: "8px",
  },

  button: {
    padding: "10px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "#222",
    color: "white",
    cursor: "pointer",
    fontSize: "12px",
  },
};