"use client";

import { formatDate, isToday, isTomorrow } from "@/lib/date-helpers";
import { resolveHighlight } from "@/lib/subtask-highlights";

interface Task {
  id: string;
  title: string;
  status: "pending" | "in_progress" | "done" | "cancelled";
  priority: "none" | "low" | "medium" | "high";
  dueDate?: string | null;
  notes?: string | null;
  coverImage?: string | null;
  isSomeday?: boolean;
  isUpcoming?: boolean;
  hideOverdue?: boolean;
  createdAt?: string;
  completedAt?: string | null;
  subtasks?: Task[];
}

interface Props {
  task: Task;
  onOpen: (task: Task) => void;
}

const PRIORITY_COLOR: Record<string, string> = {
  high: "var(--priority-high)",
  medium: "var(--priority-medium)",
  low: "var(--priority-low)",
  none: "transparent",
};

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

function ageDays(createdAt?: string): number | null {
  if (!createdAt) return null;
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000);
}


// ── SubtaskStrip ──────────────────────────────────────────────────────────────
// Shows up to MAX_VISIBLE subtask rows + a thin progress bar.
// Designed as a standalone composable section so it can be reused elsewhere.

const MAX_VISIBLE = 10;

interface SubtaskStripProps {
  subtasks: Task[];
  onSubtaskToggle?: (id: string, done: boolean) => void;
}

function SubtaskStrip({ subtasks, onSubtaskToggle }: SubtaskStripProps) {
  if (!subtasks.length) return null;

  const doneCount = subtasks.filter((s) => s.status === "done").length;
  const progress = doneCount / subtasks.length;

  // Always show pending + done-today; hide other done items
  const showable = subtasks.filter(
    (s) => s.status !== "done" || resolveHighlight(s) !== null
  );
  const visible = showable.slice(0, MAX_VISIBLE);
  const overflow = showable.length - MAX_VISIBLE;

  return (
    <div className="task-card-subtasks">
      {/* Progress bar */}
      <div className="task-card-subtasks-bar">
        <div
          className="task-card-subtasks-bar-fill"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>

      {/* Subtask rows */}
      <div className="task-card-subtasks-list">
        {visible.map((sub) => {
          const done = sub.status === "done";
          const hl = resolveHighlight(sub);
          const age = !done ? ageDays(sub.createdAt) : null;
          return (
            <div
              key={sub.id}
              className="task-card-subtask-row"
              onClick={(e) => { e.stopPropagation(); onSubtaskToggle?.(sub.id, !done); }}
              style={hl ? { background: hl.rowBg, borderRadius: 5 } : undefined}
            >
              <span
                className={`task-card-subtask-check${done ? " done" : ""}`}
                style={hl ? { borderColor: hl.checkBorderColor } : undefined}
              >
                {done && (
                  <svg width="7" height="6" viewBox="0 0 7 6" fill="none">
                    <path d="M1 3L2.8 4.8L6 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <span
                className="task-card-subtask-title"
                style={{
                  textDecoration: done ? "line-through" : "none",
                  color: done ? "var(--text-muted)" : hl ? hl.textColor : "var(--text-secondary)",
                  flex: 1,
                  fontWeight: hl ? 500 : 400,
                }}
              >
                {sub.title}
              </span>
              {age !== null && (
                <span
                  className="task-card-subtask-age"
                  style={hl ? {
                    color: hl.badgeColor,
                    background: hl.badgeBg,
                    borderColor: hl.badgeBorder,
                  } : undefined}
                >
                  {hl?.badgeLabel ?? (age === 0 ? "new" : `${age}d`)}
                </span>
              )}
            </div>
          );
        })}

        {overflow > 0 && (
          <div className="task-card-subtask-overflow">+{overflow} more</div>
        )}
      </div>
    </div>
  );
}

// ── TaskCard ──────────────────────────────────────────────────────────────────

export default function TaskCard({ task, onOpen }: Props) {
  const isDone = task.status === "done";
  const dateInfo = dueDateLabel(task.dueDate, task.hideOverdue);
  const hasCover = !!task.coverImage;
  const subtasks = task.subtasks ?? [];

  async function handleSubtaskToggle(id: string, done: boolean) {
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: done ? "done" : "pending" }),
    });
  }

  return (
    <div
      className={`task-card${isDone ? " done" : ""}`}
      onClick={() => onOpen(task)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onOpen(task)}
    >
      {/* Cover — only rendered when there's an image */}
      {hasCover && (
        <div className="task-card-cover">
          <img
            src={task.coverImage!}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />

          {/* Priority dot — top-right corner */}
          {task.priority !== "none" && (
            <div
              style={{
                position: "absolute",
                top: 10, right: 10,
                width: 8, height: 8,
                borderRadius: "50%",
                background: PRIORITY_COLOR[task.priority],
                boxShadow: `0 0 6px ${PRIORITY_COLOR[task.priority]}`,
              }}
            />
          )}

          {/* Someday / Upcoming badges — bottom-left of cover */}
          {(task.isSomeday || task.isUpcoming) && (
            <div style={{ position: "absolute", bottom: 8, left: 8, display: "flex", gap: 4 }}>
              {task.isSomeday && <span className="task-card-badge task-card-badge--someday">Someday</span>}
              {task.isUpcoming && <span className="task-card-badge task-card-badge--upcoming">Upcoming</span>}
            </div>
          )}
        </div>
      )}

      {/* Card body */}
      <div className="task-card-body">
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* When no cover: show priority dot + badges inline above title */}
          {!hasCover && (task.priority !== "none" || task.isSomeday || task.isUpcoming) && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
              {task.priority !== "none" && (
                <span style={{
                  width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
                  background: PRIORITY_COLOR[task.priority],
                  boxShadow: `0 0 5px ${PRIORITY_COLOR[task.priority]}`,
                  display: "inline-block",
                }} />
              )}
              {task.isSomeday && <span className="task-card-badge task-card-badge--someday">Someday</span>}
              {task.isUpcoming && <span className="task-card-badge task-card-badge--upcoming">Upcoming</span>}
            </div>
          )}
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
            <div
              className="task-card-title"
              style={{
                textDecoration: isDone ? "line-through" : "none",
                color: isDone ? "var(--text-muted)" : "var(--text-primary)",
              }}
            >
              {task.title}
            </div>
            {dateInfo && (
              <span style={{ color: dateInfo.color, fontSize: "0.72rem", flexShrink: 0 }}>
                {dateInfo.text}
              </span>
            )}
          </div>

          {task.notes && (
            <div className="task-card-meta">
              <span style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>notes</span>
            </div>
          )}
        </div>
      </div>

      {/* Subtask strip — only rendered when subtasks exist */}
      {subtasks.length > 0 && (
        <SubtaskStrip subtasks={subtasks} onSubtaskToggle={handleSubtaskToggle} />
      )}
    </div>
  );
}
