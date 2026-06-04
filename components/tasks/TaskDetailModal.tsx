"use client";

import { useState, useEffect } from "react";
import AddTaskInline from "./AddTaskInline";

interface Task {
  id: string;
  title: string;
  notes?: string | null;
  status: "pending" | "in_progress" | "done" | "cancelled";
  priority: "none" | "low" | "medium" | "high";
  dueDate?: string | null;
  dueTime?: string | null;
  isSomeday?: boolean;
  subtasks?: Task[];
  listId?: string | null;
}

interface Props {
  task: Task;
  onClose: () => void;
}

const PRIORITIES = ["none", "low", "medium", "high"] as const;
const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  done: "Done",
  cancelled: "Cancelled",
};

export default function TaskDetailModal({ task: initial, onClose }: Props) {
  const [task, setTask] = useState(initial);
  const [subtasks, setSubtasks] = useState<Task[]>(initial.subtasks ?? []);
  const [notes, setNotes] = useState(initial.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch(`/api/tasks/${initial.id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          setTask(d.data);
          setSubtasks(d.data.subtasks ?? []);
          setNotes(d.data.notes ?? "");
        }
      });
  }, [initial.id]);

  async function patch(updates: Partial<Task>) {
    setSaving(true);
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    const d = await res.json();
    if (d.ok) setTask({ ...task, ...d.data });
    setSaving(false);
  }

  async function deleteTask() {
    if (!confirm("Delete this task?")) return;
    setDeleting(true);
    await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
    onClose();
  }

  async function saveNotes() {
    await patch({ notes });
  }

  function refreshSubtasks() {
    fetch(`/api/tasks?parentId=${task.id}`)
      .then((r) => r.json())
      .then((d) => d.ok && setSubtasks(d.data));
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal slide-up" style={{ maxWidth: 580 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 20 }}>
          <button
            className={`task-check ${task.status === "done" ? "done" : ""}`}
            onClick={() => patch({ status: task.status === "done" ? "pending" : "done" })}
            style={{ flexShrink: 0, marginTop: 4 }}
          >
            {task.status === "done" && (
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
          <input
            className="input"
            value={task.title}
            onChange={(e) => setTask({ ...task, title: e.target.value })}
            onBlur={() => patch({ title: task.title })}
            style={{
              flex: 1, background: "transparent", border: "none", padding: 0,
              fontSize: "1.1rem", fontWeight: 600, boxShadow: "none",
              textDecoration: task.status === "done" ? "line-through" : "none",
              color: task.status === "done" ? "var(--text-muted)" : "var(--text-primary)",
            }}
          />
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 18, padding: 4 }}
          >×</button>
        </div>

        {/* Metadata row */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
          {/* Priority */}
          <select
            className="input"
            style={{ width: "auto", padding: "5px 10px", fontSize: "0.8rem" }}
            value={task.priority}
            onChange={(e) => patch({ priority: e.target.value as Task["priority"] })}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>{p === "none" ? "No priority" : p.charAt(0).toUpperCase() + p.slice(1)}</option>
            ))}
          </select>

          {/* Due date */}
          <input
            className="input"
            type="date"
            style={{ width: "auto", padding: "5px 10px", fontSize: "0.8rem" }}
            value={task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : ""}
            onChange={(e) => patch({ dueDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
          />

          {/* Status */}
          <select
            className="input"
            style={{ width: "auto", padding: "5px 10px", fontSize: "0.8rem" }}
            value={task.status}
            onChange={(e) => patch({ status: e.target.value as Task["status"] })}
          >
            {Object.entries(STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>

          {/* Someday toggle */}
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.8rem", color: "var(--text-secondary)", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={!!task.isSomeday}
              onChange={(e) => patch({ isSomeday: e.target.checked })}
            />
            Someday
          </label>
        </div>

        {/* Notes */}
        <div style={{ marginBottom: 20 }}>
          <label className="input-label">Notes</label>
          <textarea
            className="input"
            rows={4}
            placeholder="Add notes…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={saveNotes}
            style={{ resize: "vertical", fontFamily: "inherit" }}
          />
        </div>

        {/* Subtasks */}
        <div style={{ marginBottom: 20 }}>
          <div className="section-header">
            <span>↳</span> Subtasks ({subtasks.length})
          </div>
          <div style={{ marginTop: 8 }}>
            {subtasks.map((sub) => (
              <div key={sub.id} style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "6px 0", fontSize: "0.875rem",
                color: sub.status === "done" ? "var(--text-muted)" : "var(--text-primary)",
                textDecoration: sub.status === "done" ? "line-through" : "none",
              }}>
                <button
                  className={`task-check ${sub.status === "done" ? "done" : ""}`}
                  style={{ width: 16, height: 16, minWidth: 16 }}
                  onClick={async () => {
                    await fetch(`/api/tasks/${sub.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ status: sub.status === "done" ? "pending" : "done" }),
                    });
                    refreshSubtasks();
                  }}
                >
                  {sub.status === "done" && (
                    <svg width="8" height="6" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
                {sub.title}
              </div>
            ))}
            <AddTaskInline parentId={task.id} listId={task.listId ?? undefined} onCreated={refreshSubtasks} />
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
          <button className="btn btn-danger btn-sm" onClick={deleteTask} disabled={deleting}>
            {deleting ? "Deleting…" : "Delete"}
          </button>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            {saving ? "Saving…" : "Changes auto-saved"}
          </span>
        </div>
      </div>
    </div>
  );
}
