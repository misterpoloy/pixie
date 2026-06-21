"use client";

export type ViewMode = "list" | "card";

interface Props {
  mode: ViewMode;
  onChange: (m: ViewMode) => void;
}

export default function ViewToggle({ mode, onChange }: Props) {
  return (
    <div style={{
      display: "flex", gap: 4,
      background: "var(--bg-card)",
      borderRadius: "var(--radius-sm)",
      padding: 3,
      border: "1px solid var(--glass-border)",
    }}>
      <button
        onClick={() => onChange("list")}
        title="List view"
        style={{
          background: mode === "list" ? "var(--bg-active)" : "transparent",
          border: "none", borderRadius: 6, padding: "5px 8px",
          cursor: "pointer",
          color: mode === "list" ? "var(--text-primary)" : "var(--text-muted)",
          transition: "all var(--transition-fast)",
          display: "flex", alignItems: "center",
        }}
      >
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
          <rect x="1" y="3"  width="13" height="1.5" rx="0.75" fill="currentColor" />
          <rect x="1" y="7"  width="13" height="1.5" rx="0.75" fill="currentColor" />
          <rect x="1" y="11" width="13" height="1.5" rx="0.75" fill="currentColor" />
        </svg>
      </button>
      <button
        onClick={() => onChange("card")}
        title="Card view"
        style={{
          background: mode === "card" ? "var(--bg-active)" : "transparent",
          border: "none", borderRadius: 6, padding: "5px 8px",
          cursor: "pointer",
          color: mode === "card" ? "var(--text-primary)" : "var(--text-muted)",
          transition: "all var(--transition-fast)",
          display: "flex", alignItems: "center",
        }}
      >
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
          <rect x="1"   y="1"   width="5.5" height="5.5" rx="1.5" fill="currentColor" />
          <rect x="8.5" y="1"   width="5.5" height="5.5" rx="1.5" fill="currentColor" />
          <rect x="1"   y="8.5" width="5.5" height="5.5" rx="1.5" fill="currentColor" />
          <rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1.5" fill="currentColor" />
        </svg>
      </button>
    </div>
  );
}
