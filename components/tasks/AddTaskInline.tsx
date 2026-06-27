"use client";

import { useState, FormEvent, useRef } from "react";
import { parseHashtags, randomTagColor } from "@/lib/hashtag-utils";

interface Props {
  defaults?: Record<string, unknown>;
  onCreated?: () => void;
  listId?: string;
  sectionId?: string;
  parentId?: string;
}

async function resolveLabels(tags: string[]): Promise<string[]> {
  if (!tags.length) return [];
  const existing: { id: string; name: string }[] = await fetch("/api/labels")
    .then((r) => r.json())
    .then((r) => r.data ?? []);
  const ids: string[] = [];
  for (const tag of tags) {
    const found = existing.find((l) => l.name.toLowerCase() === tag);
    if (found) {
      ids.push(found.id);
    } else {
      const created = await fetch("/api/labels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: tag, color: randomTagColor() }),
      }).then((r) => r.json()).then((r) => r.data);
      if (created?.id) ids.push(created.id);
    }
  }
  return ids;
}

export default function AddTaskInline({ defaults, onCreated, listId, sectionId, parentId }: Props) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function show() {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);

    const { cleanTitle, tags } = parseHashtags(title.trim());
    const labelIds = await resolveLabels(tags);

    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: cleanTitle || title.trim(),
        listId: listId ?? defaults?.listId ?? null,
        sectionId: sectionId ?? defaults?.sectionId ?? null,
        parentId: parentId ?? defaults?.parentId ?? null,
        ...defaults,
        ...(labelIds.length ? { labelIds } : {}),
      }),
    });

    setTitle("");
    setOpen(false);
    setSubmitting(false);
    onCreated?.();
  }

  function cancel() {
    setTitle("");
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        className="nav-item"
        onClick={show}
        style={{
          marginTop: 8,
          color: "var(--text-muted)",
          fontSize: "0.875rem",
          padding: "8px 12px",
          width: "auto",
        }}
      >
        <span style={{ fontSize: 16, color: "var(--accent)" }}>＋</span>
        Add task
      </button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="glass-card"
      style={{
        marginTop: 8, padding: "12px 14px",
        display: "flex", flexDirection: "column", gap: 10,
      }}
    >
      <input
        ref={inputRef}
        className="input"
        placeholder="Task name"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && cancel()}
        style={{ background: "transparent", border: "none", padding: "0", fontSize: "0.95rem", boxShadow: "none" }}
      />
      <div style={{ display: "flex", gap: 8 }}>
        <button type="submit" className="btn btn-primary btn-sm" disabled={submitting || !title.trim()}>
          Add
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={cancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
