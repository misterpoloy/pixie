"use client";

import { useEffect, useRef, useState } from "react";

interface Label {
  id: string;
  name: string;
  color: string;
}

interface Props {
  taskId: string;
  current: Label[];
  onUpdate: (labels: Label[]) => void;
  onClose: () => void;
}

const PRESET_COLORS = [
  "#7c6ef7", "#0a84ff", "#30d158", "#ffd60a",
  "#ff9f0a", "#ff453a", "#bf5af2", "#32ade6",
  "#ac8e68", "#636366",
];

export default function SubtaskTagPicker({ taskId, current, onUpdate, onClose }: Props) {
  const [allLabels, setAllLabels] = useState<Label[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set(current.map((l) => l.id)));
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/labels").then((r) => r.json()).then((d) => d.ok && setAllLabels(d.data));
  }, []);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  useEffect(() => {
    if (creating) inputRef.current?.focus();
  }, [creating]);

  async function toggle(label: Label) {
    const next = new Set(selected);
    next.has(label.id) ? next.delete(label.id) : next.add(label.id);
    setSelected(next);

    const labelIds = [...next];
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ labelIds }),
    });

    const updatedLabels = allLabels.filter((l) => next.has(l.id));
    onUpdate(updatedLabels);
  }

  async function createLabel() {
    if (!newName.trim()) return;
    setSaving(true);
    const res = await fetch("/api/labels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), color: newColor }),
    });
    const d = await res.json();
    if (d.ok) {
      const created: Label = d.data;
      setAllLabels((prev) => [...prev, created]);
      // Auto-select newly created label
      const next = new Set(selected);
      next.add(created.id);
      setSelected(next);
      await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ labelIds: [...next] }),
      });
      const updatedLabels = [...allLabels, created].filter((l) => next.has(l.id));
      onUpdate(updatedLabels);
    }
    setNewName("");
    setCreating(false);
    setSaving(false);
  }

  return (
    <div
      ref={ref}
      style={{
        position: "absolute",
        zIndex: 300,
        background: "var(--bg-elevated)",
        border: "1px solid var(--glass-border-strong)",
        borderRadius: "var(--radius-md)",
        boxShadow: "var(--glass-shadow-lg)",
        backdropFilter: "var(--glass-blur)",
        WebkitBackdropFilter: "var(--glass-blur)",
        width: 220,
        padding: "10px 0 6px",
      }}
    >
      <div style={{ padding: "0 10px 6px", fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)" }}>
        Tags
      </div>

      {/* Existing labels */}
      <div style={{ maxHeight: 200, overflowY: "auto" }}>
        {allLabels.length === 0 && !creating && (
          <div style={{ padding: "8px 12px", fontSize: "0.75rem", color: "var(--text-muted)" }}>No tags yet</div>
        )}
        {allLabels.map((label) => {
          const on = selected.has(label.id);
          return (
            <button
              key={label.id}
              onClick={() => toggle(label)}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                width: "100%", padding: "6px 12px",
                background: on ? "rgba(255,255,255,0.05)" : "transparent",
                border: "none", cursor: "pointer",
                transition: "background var(--transition-fast)",
              }}
            >
              <span style={{
                width: 10, height: 10, borderRadius: "50%", flexShrink: 0,
                background: label.color,
                boxShadow: on ? `0 0 6px ${label.color}` : "none",
              }} />
              <span style={{ flex: 1, fontSize: "0.8rem", color: "var(--text-primary)", textAlign: "left" }}>
                {label.name}
              </span>
              {on && (
                <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                  <path d="M1 4.5L4 7.5L10 1" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          );
        })}
      </div>

      {/* Create new tag */}
      {creating ? (
        <div style={{ padding: "8px 10px", borderTop: "1px solid var(--glass-border)" }}>
          <input
            ref={inputRef}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") createLabel(); if (e.key === "Escape") setCreating(false); }}
            placeholder="Tag name…"
            style={{
              width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid var(--glass-border)",
              borderRadius: "var(--radius-sm)", padding: "5px 8px",
              color: "var(--text-primary)", fontSize: "0.8rem", outline: "none",
              marginBottom: 8,
            }}
          />
          {/* Color swatches */}
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setNewColor(c)}
                style={{
                  width: 16, height: 16, borderRadius: "50%", background: c, border: "none",
                  cursor: "pointer", outline: newColor === c ? `2px solid white` : "2px solid transparent",
                  outlineOffset: 1,
                }}
              />
            ))}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={createLabel}
              disabled={saving || !newName.trim()}
              style={{
                flex: 1, padding: "5px 0", borderRadius: "var(--radius-sm)",
                background: "var(--accent)", color: "#fff", border: "none",
                fontSize: "0.75rem", fontWeight: 600, cursor: "pointer", opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? "…" : "Create"}
            </button>
            <button
              onClick={() => setCreating(false)}
              style={{
                padding: "5px 10px", borderRadius: "var(--radius-sm)",
                background: "transparent", color: "var(--text-muted)",
                border: "1px solid var(--glass-border)", fontSize: "0.75rem", cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setCreating(true)}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            width: "100%", padding: "6px 12px",
            background: "transparent", border: "none",
            borderTop: "1px solid var(--glass-border)",
            color: "var(--accent)", fontSize: "0.78rem", fontWeight: 500,
            cursor: "pointer", marginTop: 2,
          }}
        >
          <span style={{ fontSize: "1rem", lineHeight: 1 }}>+</span> New tag
        </button>
      )}
    </div>
  );
}
