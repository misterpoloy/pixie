"use client";

import { useState } from "react";
import { formatDate, isToday, isTomorrow } from "@/lib/date-helpers";

interface Label {
  id: string;
  name: string;
  color: string;
}

interface Task {
  id: string;
  title: string;
  status: "pending" | "in_progress" | "done" | "cancelled";
  priority: "none" | "low" | "medium" | "high";
  dueDate?: string | null;
  isSomeday?: boolean;
  subtasks?: Task[];
  labels?: { labelId: string; label?: Label }[];
  notes?: string | null;
}

interface Props {
  task: Task;
  depth?: number;
  onToggle?: (id: string, done: boolean) => void;
  onOpen?: (task: Task) => void;
  onRefresh?: () => void;
}

function dueDateLabel(date: string | null | undefined): { text: string; color: string } | null {
  if (!date) return null;
  if (isToday(date)) return { text: "Today", color: "var(--accent)" };
  if (isTomorrow(date)) return { text: "Tomorrow", color: "var(--warning)" };
  const d = new Date(date);
  const now = new Date();
  if (d < now) return { text: formatDate(date), color: "var(--danger)" };
  return { text: formatDate(date), color: "var(--text-muted)" };
}

export default function TaskItem({ task, depth = 0, onToggle, onOpen, onRefresh }: Props) {
  const [expanded, setExpanded] = useState(true);
  const isDone = task.status === "done";
  const dateInfo = dueDateLabel(task.dueDate);
  const hasSubtasks = task.subtasks && task.subtasks.length > 0;

  async function toggle() {
    const newStatus = isDone ? "pending" : "done";
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    onToggle?.(task.id, !isDone);
    onRefresh?.();
  }

  return (
    <div>
      <div className="task-item" style={{ paddingLeft: depth > 0 ? `${12 + depth * 16}px` : undefined }}>
        {/* Expand toggle for subtasks */}
        {hasSubtasks && (
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "var(--text-muted)", padding: "0 2px", fontSize: 11,
              flexShrink: 0, marginTop: 3,
            }}
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? "▾" : "▸"}
          </button>
        )}

        {/* Checkbox */}
        <button
          className={`task-check ${isDone ? "done" : ""}`}
          onClick={toggle}
          aria-label={isDone ? "Mark incomplete" : "Mark complete"}
        >
          {isDone && (
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
              <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            className={`task-title ${isDone ? "done" : ""}`}
            onClick={() => onOpen?.(task)}
          >
            {task.title}
          </div>
          {(dateInfo || task.priority !== "none") && (
            <div className="task-meta">
              {task.priority !== "none" && (
                <span className={`priority-dot ${task.priority}`} title={task.priority} />
              )}
              {dateInfo && (
                <span style={{ fontSize: "0.75rem", color: dateInfo.color }}>
                  {dateInfo.text}
                </span>
              )}
              {task.isSomeday && !dateInfo && (
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Someday</span>
              )}
            </div>
          )}
        </div>

        {/* Priority stripe */}
        {task.priority !== "none" && (
          <div style={{
            width: 3, borderRadius: 2,
            height: "60%", alignSelf: "center",
            background: `var(--priority-${task.priority})`,
            opacity: 0.7, flexShrink: 0,
          }} />
        )}
      </div>

      {/* Subtasks */}
      {hasSubtasks && expanded && (
        <div className="task-subtasks">
          {task.subtasks!.map((sub) => (
            <TaskItem
              key={sub.id}
              task={sub}
              depth={depth + 1}
              onToggle={onToggle}
              onOpen={onOpen}
              onRefresh={onRefresh}
            />
          ))}
        </div>
      )}
    </div>
  );
}
