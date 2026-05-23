import { ACTIONS } from "../../data/actions";
import { useRangeStore } from "../../stores/rangeStore";

export default function DesktopActionSidebar() {
  const selectedAction = useRangeStore((state) => state.selectedAction);

  const setSelectedAction = useRangeStore(
    (state) => state.setSelectedAction
  );

  return (
    <div style={styles.sidebar}>
      {ACTIONS.map((action) => (
        <button
          key={action.id}
          onClick={() => setSelectedAction(action)}
          style={{
            ...styles.button,
            background: action.color,
            outline:
              selectedAction.id === action.id
                ? "2px solid white"
                : "none",
          }}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}

const styles = {
  sidebar: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    width: "180px",
  },

  button: {
    border: "none",
    borderRadius: "8px",
    padding: "14px",
    color: "white",
    fontWeight: "700",
    cursor: "pointer",
  },
};