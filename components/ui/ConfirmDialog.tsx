"use client";

import { useEffect } from "react";

interface Props {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "default";
  onConfirm: () => void;
  onCancel: () => void;
}

const VARIANT = {
  danger:  { bg: "rgba(255,69,58,0.18)",  border: "rgba(255,69,58,0.35)",  color: "var(--danger)",  btnBg: "rgba(255,69,58,0.85)"  },
  warning: { bg: "rgba(255,159,10,0.18)", border: "rgba(255,159,10,0.35)", color: "var(--warning)", btnBg: "rgba(255,159,10,0.85)" },
  default: { bg: "rgba(124,110,247,0.18)",border: "rgba(124,110,247,0.35)",color: "var(--accent)",  btnBg: "var(--accent)"         },
};

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
  onCancel,
}: Props) {
  const v = VARIANT[variant];

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter") onConfirm();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onConfirm, onCancel]);

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        animation: "fadeIn 120ms ease",
      }}
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div
        style={{
          width: 340,
          background: "rgba(18,18,30,0.92)",
          backdropFilter: "blur(32px)",
          WebkitBackdropFilter: "blur(32px)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.7)",
          overflow: "hidden",
          animation: "slideUp 200ms cubic-bezier(0.34,1.2,0.64,1)",
        }}
      >
        {/* Coloured accent stripe */}
        <div style={{ height: 3, background: `linear-gradient(90deg, ${v.color}, transparent)` }} />

        <div style={{ padding: "24px 24px 20px" }}>
          {/* Icon + Title */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: message ? 10 : 20 }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
              background: v.bg, border: `1px solid ${v.border}`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {variant === "danger" ? (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 3v5M8 11v1" stroke={v.color} strokeWidth="2" strokeLinecap="round" />
                  <path d="M6.8 1.5 1.2 11a1.3 1.3 0 0 0 1.1 2h11.4a1.3 1.3 0 0 0 1.1-2L9.2 1.5a1.3 1.3 0 0 0-2.4 0Z" stroke={v.color} strokeWidth="1.5" strokeLinejoin="round" />
                </svg>
              ) : variant === "warning" ? (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="6.5" stroke={v.color} strokeWidth="1.5" />
                  <path d="M8 5v4M8 11v.5" stroke={v.color} strokeWidth="2" strokeLinecap="round" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="6.5" stroke={v.color} strokeWidth="1.5" />
                  <path d="M8 7v5M8 5v.5" stroke={v.color} strokeWidth="2" strokeLinecap="round" />
                </svg>
              )}
            </div>
            <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.3 }}>
              {title}
            </h3>
          </div>

          {message && (
            <p style={{ margin: "0 0 20px", fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.6, paddingLeft: 46 }}>
              {message}
            </p>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button
              onClick={onCancel}
              style={{
                padding: "8px 18px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--glass-border)",
                background: "rgba(255,255,255,0.06)",
                color: "var(--text-secondary)",
                fontSize: "0.82rem", fontWeight: 600,
                cursor: "pointer",
                transition: "all var(--transition-fast)",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "var(--text-primary)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              style={{
                padding: "8px 18px",
                borderRadius: "var(--radius-sm)",
                border: `1px solid ${v.border}`,
                background: v.btnBg,
                color: "#fff",
                fontSize: "0.82rem", fontWeight: 700,
                cursor: "pointer",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                transition: "all var(--transition-fast)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
