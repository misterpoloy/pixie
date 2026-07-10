"use client";

import { useEffect, useState } from "react";
import { formatDate, formatElapsedDays, isToday, isTomorrow } from "@/lib/date-helpers";
import { useToast } from "@/components/ui/ToastContext";

interface Label {
  id?: string;
  labelId?: string;
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
  isUpcoming?: boolean;
  hideOverdue?: boolean;
  createdAt?: string;
  subtasks?: Task[];
  labels?: Label[];
  notes?: string | null;
}

interface Props {
  task: Task;
  depth?: number;
  metaMode?: "default" | "upcoming";
  onToggle?: (id: string, done: boolean) => void;
  onOpen?: (task: Task) => void;
  onRefresh?: () => void;
}

function dueDateLabel(
  date: string | null | undefined,
  hideOverdue?: boolean,
): { text: string; color: string } | null {
  if (!date) return null;
  if (isToday(date)) return { text: "Today", color: "var(--accent)" };
  if (isTomorrow(date)) return { text: "Tomorrow", color: "var(--warning)" };
  const d = new Date(date);
  const now = new Date();
  if (d < now) {
    if (hideOverdue) return null;
    const days = Math.round((now.getTime() - d.getTime()) / 86_400_000);
    return { text: `+${days}d`, color: "var(--info)" };
  }
  return { text: formatDate(date), color: "var(--text-muted)" };
}

function isCreatedToday(createdAt?: string): boolean {
  if (!createdAt) return false;
  const today = new Date().toISOString().slice(0, 10);
  return createdAt.slice(0, 10) === today;
}

export default function TaskItem({ task, depth = 0, metaMode = "default", onToggle, onOpen, onRefresh }: Props) {
  const [expanded, setExpanded] = useState(true);
  const [localStatus, setLocalStatus] = useState(task.status);
  const { toast } = useToast();

  useEffect(() => setLocalStatus(task.status), [task.status]);

  const isDone = localStatus === "done";
  const createdToday = !isDone && isCreatedToday(task.createdAt);
  const dateInfo = dueDateLabel(task.dueDate, task.hideOverdue);
  const metaText =
    metaMode === "upcoming" && task.isUpcoming && task.createdAt
      ? { text: formatElapsedDays(task.createdAt), color: "var(--text-muted)" }
      : dateInfo;
  const hasSubtasks = task.subtasks && task.subtasks.length > 0;

  // Flip instantly, confirm via toast once the PATCH lands, revert on failure.
  async function toggle() {
    const prevStatus = localStatus;
    const newStatus = isDone ? "pending" : "done";
    setLocalStatus(newStatus);
    onToggle?.(task.id, newStatus === "done");
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      toast(newStatus === "done" ? "Task completed" : "Task reopened", { variant: "success" });
      onRefresh?.();
    } catch {
      setLocalStatus(prevStatus);
      onToggle?.(task.id, prevStatus === "done");
      toast("Could not update task", { variant: "error" });
    }
  }

  return (
    <div>
      <div
        className="task-item"
        style={{
          paddingLeft: depth > 0 ? `${12 + depth * 16}px` : undefined,
          borderLeft: createdToday ? "2px solid var(--accent)" : undefined,
          background: createdToday ? "rgba(124,110,247,0.06)" : undefined,
          borderRadius: createdToday ? "var(--radius-sm)" : undefined,
        }}
      >
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
          {(metaText || task.priority !== "none" || task.isSomeday) && (
            <div className="task-meta">
              {task.priority !== "none" && (
                <span className={`priority-dot ${task.priority}`} title={task.priority} />
              )}
              {metaText && (
                <span style={{ fontSize: "0.75rem", color: metaText.color }}>
                  {metaText.text}
                </span>
              )}
              {task.isSomeday && !metaText && (
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Someday</span>
              )}
            </div>
          )}
          {task.labels && task.labels.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 3 }}>
              {task.labels.map((lbl) => (
                <span
                  key={lbl.labelId ?? lbl.id}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 3,
                    padding: "2px 7px", borderRadius: 20,
                    fontSize: "0.62rem", fontWeight: 500,
                    background: `${lbl.color}22`,
                    border: `1px solid ${lbl.color}55`,
                    color: lbl.color,
                  }}
                >
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: lbl.color, flexShrink: 0 }} />
                  {lbl.name}
                </span>
              ))}
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
              metaMode={metaMode}
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
