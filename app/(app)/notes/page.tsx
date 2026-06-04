"use client";

import { useEffect, useState, FormEvent } from "react";

interface Note {
  id: string;
  title?: string | null;
  content: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [active, setActive] = useState<Note | null>(null);
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch("/api/notes");
    const data = await res.json();
    if (data.ok) setNotes(data.data);
  }

  useEffect(() => { load(); }, []);

  async function createNote() {
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Untitled", content: "" }),
    });
    const data = await res.json();
    if (data.ok) {
      await load();
      openNote(data.data);
    }
  }

  function openNote(note: Note) {
    setActive(note);
    setTitle(note.title ?? "");
    setContent(note.content);
  }

  async function save() {
    if (!active) return;
    setSaving(true);
    await fetch(`/api/notes/${active.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content }),
    });
    setSaving(false);
    load();
  }

  return (
    <div style={{ display: "flex", gap: 24, height: "calc(100vh - 80px)" }}>
      {/* Sidebar */}
      <div style={{ width: 220, flexShrink: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>Notes</h2>
          <button className="btn btn-primary btn-sm" onClick={createNote}>＋</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
          {notes.map((note) => (
            <button
              key={note.id}
              onClick={() => openNote(note)}
              style={{
                background: active?.id === note.id ? "var(--accent-dim)" : "var(--bg-card)",
                border: `1px solid ${active?.id === note.id ? "var(--accent)" : "var(--glass-border)"}`,
                borderRadius: "var(--radius-sm)",
                padding: "10px 12px",
                cursor: "pointer",
                textAlign: "left",
                width: "100%",
              }}
            >
              <div style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--text-primary)", marginBottom: 2 }}>
                {note.title || "Untitled"}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", overflow: "hidden", maxHeight: "2.4em" }}>
                {note.content.slice(0, 60) || "No content"}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Editor */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
        {active ? (
          <>
            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={save}
              placeholder="Note title…"
              style={{ fontSize: "1.1rem", fontWeight: 600, background: "transparent", border: "none", borderBottom: "1px solid var(--glass-border)", borderRadius: 0, padding: "8px 0", boxShadow: "none" }}
            />
            <textarea
              className="input"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onBlur={save}
              placeholder="Start writing…"
              style={{ flex: 1, resize: "none", fontFamily: "inherit", fontSize: "0.95rem", lineHeight: 1.7 }}
            />
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              {saving ? "Saving…" : "Auto-saved on blur"}
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", flexDirection: "column", gap: 12 }}>
            <span style={{ fontSize: 40 }}>📝</span>
            <p>Select a note or create a new one</p>
            <button className="btn btn-primary" onClick={createNote}>New note</button>
          </div>
        )}
      </div>
    </div>
  );
}
