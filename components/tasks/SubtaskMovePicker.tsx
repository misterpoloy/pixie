"use client";

import { useState, useEffect, useRef } from "react";

interface ParentTask {
  id: string;
  title: string;
  listId?: string | null;
}

interface Props {
  subtaskId: string;
  currentParentId: string;
  onMoved: () => void;
  onClose: () => void;
}

export default function SubtaskMovePicker({ subtaskId, currentParentId, onMoved, onClose }: Props) {
  const [tasks, setTasks] = useState<ParentTask[]>([]);
  const [query, setQuery] = useState("");
  const [moving, setMoving] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/tasks?parentId=null")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setTasks(d.data.filter((t: ParentTask) => t.id !== currentParentId));
      });
  }, [currentParentId]);

  useEffect(() => {
    inputRef.current?.focus();

    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  async function moveTo(targetId: string) {
    setMoving(true);
    await fetch(`/api/tasks/${subtaskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parentId: targetId }),
    });
    setMoving(false);
    onMoved();
    onClose();
  }

  const filtered = tasks.filter((t) =>
    t.title.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        top: "100%",
        right: 0,
        zIndex: 300,
        width: 260,
        background: "var(--bg-elevated)",
        border: "1px solid var(--glass-border-strong)",
        borderRadius: "var(--radius-md)",
        boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
        overflow: "hidden",
        marginTop: 4,
      }}
    >
      <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--glass-border)" }}>
        <div style={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 6 }}>
          Move to…
        </div>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tasks…"
          style={{
            width: "100%", boxSizing: "border-box",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid var(--glass-border)",
            borderRadius: 6, padding: "5px 8px",
            color: "var(--text-primary)", fontSize: "0.78rem",
            fontFamily: "inherit", outline: "none",
          }}
          onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
          onBlur={(e) => (e.target.style.borderColor = "var(--glass-border)")}
        />
      </div>

      <div style={{ maxHeight: 200, overflowY: "auto" }}>
        {filtered.length === 0 && (
          <div style={{ padding: "12px 12px", fontSize: "0.78rem", color: "var(--text-muted)", fontStyle: "italic" }}>
            No tasks found
          </div>
        )}
        {filtered.map((t) => (
          <button
            key={t.id}
            disabled={moving}
            onClick={() => moveTo(t.id)}
            style={{
              width: "100%", textAlign: "left",
              background: "transparent",
              border: "none", borderBottom: "1px solid rgba(255,255,255,0.04)",
              padding: "8px 12px", cursor: "pointer",
              color: "var(--text-primary)", fontSize: "0.82rem",
              lineHeight: 1.35, transition: "background var(--transition-fast)",
              display: "flex", alignItems: "center", gap: 8,
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "var(--bg-hover)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "transparent")}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0, opacity: 0.5 }}>
              <rect x="1" y="1" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.3" />
              <path d="M3.5 6h5M6.5 4l2 2-2 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {t.title}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
