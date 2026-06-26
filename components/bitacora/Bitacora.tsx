"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { formatDistanceToNow, format } from "date-fns";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Entry {
  id: string;
  content: string;
  entryDate: string;
  source: string;
  authorName: string;
  listId: string | null;
  taskId: string | null;
  isPastDated: boolean;
  metadata: string | null;
  createdAt: string;
  updatedAt: string;
  listName: string | null;
  listColor: string | null;
}

interface Props {
  dateStr: string; // YYYY-MM-DD — the currently viewed date
}

// ── Source badge config (extensible: unknown sources get a neutral style) ──────

const SOURCE_STYLE: Record<string, { label: string; bg: string; color: string; border: string }> = {
  user:   { label: "You",    bg: "rgba(124,110,247,0.12)", color: "var(--accent-hover)", border: "rgba(124,110,247,0.3)" },
  agent:  { label: "Agent",  bg: "rgba(10,132,255,0.12)",  color: "var(--info)",         border: "rgba(10,132,255,0.3)"  },
  system: { label: "System", bg: "rgba(255,255,255,0.06)", color: "var(--text-muted)",   border: "rgba(255,255,255,0.12)" },
};

function sourceStyle(source: string) {
  return SOURCE_STYLE[source] ?? {
    label: source,
    bg: "rgba(255,159,10,0.12)", color: "var(--warning)", border: "rgba(255,159,10,0.3)",
  };
}

function timeAgo(iso: string) {
  return formatDistanceToNow(new Date(iso), { addSuffix: true });
}

function fmtDateTime(iso: string) {
  return format(new Date(iso), "MMM d, h:mm a");
}

// ── Single entry card ──────────────────────────────────────────────────────────

function EntryCard({
  entry,
  onDelete,
  onEdit,
}: {
  entry: Entry;
  onDelete: (id: string) => void;
  onEdit: (id: string, content: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(entry.content);
  const [saving, setSaving] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const ss = sourceStyle(entry.source);

  useEffect(() => {
    if (editing) textRef.current?.focus();
  }, [editing]);

  async function save() {
    if (!draft.trim() || draft.trim() === entry.content) { setEditing(false); return; }
    setSaving(true);
    await fetch(`/api/bitacora/${entry.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: draft.trim() }),
    });
    setSaving(false);
    onEdit(entry.id, draft.trim());
    setEditing(false);
  }

  return (
    <div
      className="bitacora-entry"
      style={{ borderLeft: `2px solid ${ss.border}` }}
    >
      {/* Header row */}
      <div className="bitacora-entry-header" onClick={() => !editing && setExpanded((v) => !v)}>
        <span className="bitacora-source-chip" style={{ background: ss.bg, color: ss.color, border: `1px solid ${ss.border}` }}>
          {ss.label}
        </span>

        {entry.isPastDated && (
          <span className="bitacora-past-badge" title="Added retroactively for this date">
            past
          </span>
        )}

        {entry.listName && (
          <span className="bitacora-list-badge" style={{ background: `${entry.listColor}22`, color: entry.listColor ?? "var(--text-muted)", border: `1px solid ${entry.listColor}44` }}>
            <span className="bitacora-list-dot" style={{ background: entry.listColor ?? "currentColor" }} />
            {entry.listName}
          </span>
        )}

        <span className="bitacora-time" title={fmtDateTime(entry.createdAt)}>
          {timeAgo(entry.createdAt)}
        </span>

        <div className="bitacora-actions" onClick={(e) => e.stopPropagation()}>
          <button className="bitacora-action-btn" title="Edit" onClick={() => { setExpanded(true); setEditing(true); }}>
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <path d="M8.5 1.5a1.5 1.5 0 0 1 2.12 2.12L4 10.25l-2.75.5.5-2.75L8.5 1.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button className="bitacora-action-btn bitacora-action-btn--danger" title="Delete" onClick={() => onDelete(entry.id)}>
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <path d="M2 3h8M5 3V2h2v1M4.5 3v6.5M7.5 3v6.5M3 3l.5 7h5L9 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content preview (always visible, truncated) */}
      {!editing && (
        <div
          className={`bitacora-content${expanded ? " bitacora-content--expanded" : ""}`}
          onClick={() => setExpanded((v) => !v)}
        >
          {entry.content}
        </div>
      )}

      {/* Edit area */}
      {editing && (
        <div style={{ marginTop: 8 }}>
          <textarea
            ref={textRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); save(); }
              if (e.key === "Escape") { setEditing(false); setDraft(entry.content); }
            }}
            className="bitacora-textarea"
            rows={3}
          />
          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
            <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
            <button className="btn btn-sm" onClick={() => { setEditing(false); setDraft(entry.content); }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Expanded metadata */}
      {expanded && !editing && (
        <div className="bitacora-meta">
          <span>Created {fmtDateTime(entry.createdAt)}</span>
          {entry.updatedAt !== entry.createdAt && <span>· Edited {fmtDateTime(entry.updatedAt)}</span>}
        </div>
      )}
    </div>
  );
}

// ── Compose box ────────────────────────────────────────────────────────────────

function ComposeBox({ dateStr, onCreated }: { dateStr: string; onCreated: (entry: Entry) => void }) {
  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);

  async function submit() {
    const trimmed = content.trim();
    if (!trimmed) return;
    setPosting(true);
    const res = await fetch("/api/bitacora", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: trimmed, entryDate: dateStr }),
    });
    const d = await res.json();
    if (d.ok) {
      onCreated({ ...d.data, listName: null, listColor: null });
      setContent("");
    }
    setPosting(false);
  }

  return (
    <div className="bitacora-compose">
      <textarea
        ref={textRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submit(); }
        }}
        placeholder="Add a log entry… (⌘↵ to save)"
        className="bitacora-textarea"
        rows={2}
      />
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
        <button
          className="btn btn-primary btn-sm"
          onClick={submit}
          disabled={posting || !content.trim()}
        >
          {posting ? "Saving…" : "Log it"}
        </button>
      </div>
    </div>
  );
}

// ── Main Bitacora section ──────────────────────────────────────────────────────

export default function Bitacora({ dateStr }: Props) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/bitacora?date=${dateStr}`);
    const d = await res.json();
    if (d.ok) setEntries(d.data);
    setLoading(false);
  }, [dateStr]);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id: string) {
    await fetch(`/api/bitacora/${id}`, { method: "DELETE" });
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  function handleEdit(id: string, content: string) {
    setEntries((prev) => prev.map((e) => e.id === id ? { ...e, content, updatedAt: new Date().toISOString() } : e));
  }

  return (
    <div className="bitacora-section">
      {/* Section header */}
      <button className="bitacora-header" onClick={() => setCollapsed((v) => !v)}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ opacity: 0.7 }}>
            <rect x="1" y="1" width="12" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.3" />
            <path d="M4 5h6M4 7.5h6M4 10h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          <span className="bitacora-header-title">Bitacora</span>
          {entries.length > 0 && (
            <span className="bitacora-count">{entries.length}</span>
          )}
        </div>
        <svg
          width="12" height="12" viewBox="0 0 12 12" fill="none"
          style={{ transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)", transition: "transform 200ms ease", opacity: 0.5 }}
        >
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {!collapsed && (
        <div className="bitacora-body">
          <ComposeBox dateStr={dateStr} onCreated={(entry) => setEntries((prev) => [...prev, entry])} />

          {loading && (
            <div style={{ padding: "12px 0", color: "var(--text-muted)", fontSize: "0.8rem" }}>Loading…</div>
          )}

          {!loading && entries.length === 0 && (
            <div style={{ padding: "16px 0 4px", color: "var(--text-muted)", fontSize: "0.82rem", fontStyle: "italic" }}>
              No entries for this day yet.
            </div>
          )}

          {!loading && entries.length > 0 && (
            <div className="bitacora-list">
              {entries.map((entry) => (
                <EntryCard
                  key={entry.id}
                  entry={entry}
                  onDelete={handleDelete}
                  onEdit={handleEdit}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
