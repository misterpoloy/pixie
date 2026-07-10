"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatDistanceToNow, format, isToday, isYesterday, isThisWeek } from "date-fns";
import AddTaskInline from "./AddTaskInline";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import SubtaskTagPicker from "./SubtaskTagPicker";
import SubtaskMovePicker from "./SubtaskMovePicker";
import { resolveHighlight } from "@/lib/subtask-highlights";
import { addDays } from "@/lib/date-helpers";
import { useToast } from "@/components/ui/ToastContext";

interface TaskLabel {
  labelId: string;
  name: string;
  color: string;
}

interface Task {
  id: string;
  title: string;
  notes?: string | null;
  status: "pending" | "in_progress" | "done" | "cancelled";
  priority: "none" | "low" | "medium" | "high";
  dueDate?: string | null;
  dueTime?: string | null;
  isSomeday?: boolean;
  isUpcoming?: boolean;
  hideOverdue?: boolean;
  subtasks?: Task[];
  labels?: TaskLabel[];
  listId?: string | null;
  coverImage?: string | null;
  createdAt?: string;
  completedAt?: string | null;
  updatedAt?: string;
  updatedBy?: string | null;
}

interface Comment {
  id: string;
  authorName: string;
  content: string;
  createdAt: string;
}

interface Props {
  task: Task;
  onClose: () => void;
  referenceDate?: string; // YYYY-MM-DD for highlight system
}

// ── Chip style maps ────────────────────────────────────────────────────────────

const PRIORITY_CHIP: Record<string, { label: string; bg: string; border: string; color: string }> = {
  none:   { label: "",         bg: "transparent",            border: "transparent",            color: "transparent" },
  low:    { label: "Low",      bg: "rgba(48,209,88,0.15)",   border: "rgba(48,209,88,0.35)",   color: "var(--priority-low)" },
  medium: { label: "Medium",   bg: "rgba(255,159,10,0.15)",  border: "rgba(255,159,10,0.35)",  color: "var(--priority-medium)" },
  high:   { label: "High",     bg: "rgba(255,69,58,0.15)",   border: "rgba(255,69,58,0.35)",   color: "var(--priority-high)" },
};

const STATUS_CHIP: Record<string, { label: string; bg: string; border: string; color: string }> = {
  pending:     { label: "Pending",     bg: "rgba(255,255,255,0.08)", border: "rgba(255,255,255,0.15)", color: "var(--text-secondary)" },
  in_progress: { label: "In Progress", bg: "rgba(10,132,255,0.15)",  border: "rgba(10,132,255,0.3)",   color: "var(--info)" },
  done:        { label: "Done",        bg: "rgba(48,209,88,0.15)",   border: "rgba(48,209,88,0.3)",    color: "var(--success)" },
  cancelled:   { label: "Cancelled",   bg: "rgba(255,69,58,0.1)",    border: "rgba(255,69,58,0.2)",    color: "var(--danger)" },
};

const PRIORITIES = ["none", "low", "medium", "high"] as const;
const STATUS_LABELS: Record<string, string> = {
  pending: "Pending", in_progress: "In Progress", done: "Done", cancelled: "Cancelled",
};

const MOVE_TARGETS = [
  { key: "tomorrow", label: "Tomorrow" },
  { key: "upcoming", label: "Upcoming" },
  { key: "someday", label: "Someday" },
] as const;
type MoveTarget = (typeof MOVE_TARGETS)[number]["key"];

function Chip({ bg, border, color, children }: { bg: string; border: string; color: string; children: React.ReactNode }) {
  return (
    <span style={{
      background: bg, border: `1px solid ${border}`, color,
      borderRadius: "var(--radius-full)", padding: "3px 10px",
      fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.02em",
      backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
      whiteSpace: "nowrap",
    }}>
      {children}
    </span>
  );
}

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// "Jun 20, 12:43 PM" — used as tooltip title
function formatDateTime(iso: string) {
  return format(new Date(iso), "MMM d, h:mm a");
}

// "3 days ago", "about 2 months ago", "less than a minute ago"
function timeAgo(iso: string): string {
  return formatDistanceToNow(new Date(iso), { addSuffix: true });
}

// ── Subtask Detail Panel ───────────────────────────────────────────────────────

function SubtaskDetailPanel({
  sub,
  onClose,
  onRefresh,
}: {
  sub: Task;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState(sub.title);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const textRef = useRef<HTMLTextAreaElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setTitle(sub.title);
  }, [sub.id, sub.title]);

  useEffect(() => {
    // Animate in
    requestAnimationFrame(() => setVisible(true));

    fetch(`/api/tasks/${sub.id}/comments`)
      .then((r) => r.json())
      .then((d) => d.ok && setComments(d.data));
  }, [sub.id]);

  function handleTitleChange(value: string) {
    setTitle(value);
    setSaveState("idle");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (!value.trim() || value.trim() === sub.title) return;
      setSaveState("saving");
      await fetch(`/api/tasks/${sub.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: value.trim() }),
      });
      setSaveState("saved");
      onRefresh();
      setTimeout(() => setSaveState("idle"), 1800);
    }, 600);
  }

  async function postComment() {
    const content = draft.trim();
    if (!content) return;
    setPosting(true);
    const res = await fetch(`/api/tasks/${sub.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, authorName: "You" }),
    });
    const d = await res.json();
    if (d.ok) {
      setComments((prev) => [...prev, d.data]);
      setDraft("");
    }
    setPosting(false);
  }

  const isDone = sub.status === "done";

  return (
    <div
      style={{
        width: 340,
        flexShrink: 0,
        borderLeft: "1px solid var(--glass-border)",
        display: "flex",
        flexDirection: "column",
        background: "rgba(255,255,255,0.02)",
        transform: visible ? "translateX(0)" : "translateX(32px)",
        opacity: visible ? 1 : 0,
        transition: "transform 280ms cubic-bezier(0.34,1.2,0.64,1), opacity 220ms ease",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div style={{
        padding: "14px 16px 12px",
        borderBottom: "1px solid var(--glass-border)",
        display: "flex", alignItems: "flex-start", gap: 10,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
            <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Subtask
            </div>
            <div style={{
              fontSize: "0.62rem", fontWeight: 500,
              color: saveState === "saved" ? "var(--success)" : "var(--text-muted)",
              opacity: saveState === "idle" ? 0 : 1,
              transition: "opacity 200ms ease, color 200ms ease",
            }}>
              {saveState === "saving" ? "Saving…" : "Saved"}
            </div>
          </div>
          <textarea
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            rows={2}
            style={{
              width: "100%", resize: "none", boxSizing: "border-box",
              background: "transparent",
              border: "1px solid transparent",
              borderRadius: 6, padding: "2px 4px",
              fontSize: "0.95rem", fontWeight: 700, lineHeight: 1.35,
              color: isDone ? "var(--text-muted)" : "var(--text-primary)",
              textDecoration: isDone ? "line-through" : "none",
              fontFamily: "inherit",
              outline: "none",
              transition: "border-color var(--transition-fast), background var(--transition-fast)",
              wordBreak: "break-word",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "var(--glass-border-strong)";
              e.target.style.background = "rgba(255,255,255,0.04)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "transparent";
              e.target.style.background = "transparent";
            }}
          />
        </div>
        <button
          onClick={onClose}
          style={{
            flexShrink: 0, background: "rgba(255,255,255,0.08)",
            border: "1px solid var(--glass-border)", borderRadius: 7,
            width: 26, height: 26, cursor: "pointer",
            color: "var(--text-muted)", fontSize: 16, lineHeight: 1,
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all var(--transition-fast)",
          }}
        >×</button>
      </div>

      {/* Metadata */}
      <div style={{
        padding: "12px 16px",
        borderBottom: "1px solid var(--glass-border)",
        display: "flex", flexDirection: "column", gap: 8,
      }}>
        <MetaRow icon="📅" label="Created" value={sub.createdAt ? timeAgo(sub.createdAt) : "—"} title={sub.createdAt ? formatDateTime(sub.createdAt) : undefined} />
        <MetaRow icon="✏️" label="Modified" value={sub.updatedAt ? timeAgo(sub.updatedAt) : "—"} title={sub.updatedAt ? formatDateTime(sub.updatedAt) : undefined} />
        {sub.updatedBy && (
          <MetaRow icon="🤖" label="By" value={sub.updatedBy} />
        )}
        <MetaRow
          icon="●"
          label="Status"
          value={STATUS_LABELS[sub.status] ?? sub.status}
          valueColor={STATUS_CHIP[sub.status]?.color}
        />
      </div>

      {/* Comments list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
        <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10 }}>
          Comments {comments.length > 0 && `(${comments.length})`}
        </div>

        {comments.length === 0 && (
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontStyle: "italic", marginBottom: 12 }}>
            No comments yet
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {comments.map((c) => (
            <div key={c.id} className="comment-bubble">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--accent-hover)" }}>
                  {c.authorName}
                </span>
                <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }} title={formatDateTime(c.createdAt)}>
                  {timeAgo(c.createdAt)}
                </span>
              </div>
              <div style={{ fontSize: "0.82rem", lineHeight: 1.5, color: "var(--text-secondary)", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {c.content}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Comment input */}
      <div style={{
        padding: "10px 16px 14px",
        borderTop: "1px solid var(--glass-border)",
        background: "rgba(0,0,0,0.15)",
      }}>
        <textarea
          ref={textRef}
          rows={2}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              postComment();
            }
          }}
          placeholder="Add a comment… (⌘↵ to send)"
          style={{
            width: "100%", resize: "none",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid var(--glass-border)",
            borderRadius: 8, padding: "7px 10px",
            color: "var(--text-primary)", fontSize: "0.8rem",
            fontFamily: "inherit", lineHeight: 1.5,
            outline: "none", boxSizing: "border-box",
            transition: "border-color var(--transition-fast)",
          }}
          onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
          onBlur={(e) => (e.target.style.borderColor = "var(--glass-border)")}
        />
        <button
          onClick={postComment}
          disabled={posting || !draft.trim()}
          style={{
            marginTop: 6, width: "100%",
            background: draft.trim() ? "var(--accent)" : "rgba(255,255,255,0.06)",
            border: "1px solid transparent",
            borderRadius: 8, padding: "6px 0",
            color: draft.trim() ? "#fff" : "var(--text-muted)",
            fontSize: "0.78rem", fontWeight: 600, cursor: draft.trim() ? "pointer" : "default",
            transition: "all var(--transition-fast)",
          }}
        >
          {posting ? "Posting…" : "Send"}
        </button>
      </div>
    </div>
  );
}

function MetaRow({ icon, label, value, valueColor, title }: { icon: string; label: string; value: string; valueColor?: string; title?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
      <span style={{ fontSize: "0.72rem", width: 60, color: "var(--text-muted)", flexShrink: 0 }}>{label}</span>
      <span title={title} style={{ fontSize: "0.75rem", color: valueColor ?? "var(--text-secondary)", lineHeight: 1.4, cursor: title ? "default" : undefined }}>
        {value}
      </span>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function TaskDetailModal({ task: initial, onClose, referenceDate }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [task, setTask] = useState(initial);
  const [subtasks, setSubtasks] = useState<Task[]>(initial.subtasks ?? []);
  const [notes, setNotes] = useState(initial.notes ?? "");
  const [coverImage, setCoverImage] = useState(initial.coverImage ?? "");
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showAllClosed, setShowAllClosed] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [selectedSub, setSelectedSub] = useState<Task | null>(null);
  const [tagPickerSubId, setTagPickerSubId] = useState<string | null>(null);
  const [movePickerSubId, setMovePickerSubId] = useState<string | null>(null);
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const [moving, setMoving] = useState(false);
  const moveMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMoveMenu) return;
    function handleClick(e: MouseEvent) {
      if (moveMenuRef.current && !moveMenuRef.current.contains(e.target as Node)) {
        setShowMoveMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showMoveMenu]);

  // Load full task data
  useEffect(() => {
    fetch(`/api/tasks/${initial.id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          setTask(d.data);
          setSubtasks(d.data.subtasks ?? []);
          setNotes(d.data.notes ?? "");
          setCoverImage(d.data.coverImage ?? "");

          // Restore subtask panel from URL
          const subId = searchParams.get("sub");
          if (subId && d.data.subtasks) {
            const match = d.data.subtasks.find((s: Task) => s.id === subId);
            if (match) setSelectedSub(match);
          }
        }
      });
  }, [initial.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync URL when subtask panel opens/closes
  useEffect(() => {
    const url = new URL(window.location.href);
    if (selectedSub) {
      url.searchParams.set("task", initial.id);
      url.searchParams.set("sub", selectedSub.id);
    } else {
      url.searchParams.delete("sub");
    }
    router.replace(url.pathname + url.search, { scroll: false });
  }, [selectedSub]); // eslint-disable-line react-hooks/exhaustive-deps

  async function patch(updates: Partial<Task>) {
    setSaving(true);
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    const d = await res.json();
    if (d.ok) setTask((prev) => ({ ...prev, ...d.data }));
    setSaving(false);
  }

  // Flips the checkbox instantly instead of waiting on the round-trip, then
  // reconciles with the server response and confirms via toast. Reverts on failure.
  async function toggleTaskStatus() {
    const prevStatus = task.status;
    const prevCompletedAt = task.completedAt;
    const nextStatus = prevStatus === "done" ? "pending" : "done";
    setTask((prev) => ({ ...prev, status: nextStatus }));
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const d = await res.json();
      if (!res.ok || !d.ok) throw new Error(d.error ?? "Could not update task");
      setTask((prev) => ({ ...prev, ...d.data }));
      toast(nextStatus === "done" ? "Task completed" : "Task reopened", { variant: "success" });
    } catch (e) {
      setTask((prev) => ({ ...prev, status: prevStatus, completedAt: prevCompletedAt }));
      toast(e instanceof Error ? e.message : "Could not update task", { variant: "error" });
    }
  }

  async function deleteTask() {
    setDeleting(true);
    await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
    onClose();
  }

  // Moves this task (and its subtasks, which tag along since they render under
  // the parent regardless of view) out of Today and into another view. The
  // today/tomorrow filters key off dueDate alone, so dueDate must be cleared
  // when moving to Upcoming/Someday or the task would linger in both views.
  async function moveTask(target: MoveTarget) {
    setShowMoveMenu(false);
    setMoving(true);
    const updates: Partial<Task> =
      target === "tomorrow"
        ? { dueDate: addDays(new Date(), 1).toISOString(), isSomeday: false, isUpcoming: false }
        : target === "upcoming"
          ? { isUpcoming: true, isSomeday: false, dueDate: null }
          : { isSomeday: true, isUpcoming: false, dueDate: null };

    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    const d = await res.json();
    setMoving(false);
    if (d.ok) {
      const label = MOVE_TARGETS.find((t) => t.key === target)!.label;
      toast(`Moved to ${label}`, { variant: "success" });
      onClose();
    } else {
      toast(d.error ?? "Could not move task", { variant: "error" });
    }
  }

  function refreshSubtasks() {
    fetch(`/api/tasks?parentId=${task.id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          setSubtasks(d.data);
          // Refresh selectedSub data if it's open
          if (selectedSub) {
            const updated = d.data.find((s: Task) => s.id === selectedSub.id);
            if (updated) setSelectedSub(updated);
          }
        }
      });
  }

  function openSub(sub: Task) {
    // Fetch latest subtask data before opening panel
    fetch(`/api/tasks/${sub.id}`)
      .then((r) => r.json())
      .then((d) => setSelectedSub(d.ok ? { ...sub, ...d.data } : sub));
  }

  function closeSub() {
    setSelectedSub(null);
    refreshSubtasks();
  }

  const isDone = task.status === "done";
  const pChip = PRIORITY_CHIP[task.priority];
  const sChip = STATUS_CHIP[task.status];
  const hasCover = !!coverImage;

  // ── Hero ────────────────────────────────────────────────────────────────────

  const heroHeight = editMode ? 120 : 200;

  const hero = (
    <div style={{ position: "relative", height: heroHeight, flexShrink: 0, overflow: "hidden" }}>
      {hasCover ? (
        <img src={coverImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} onError={(e) => (e.currentTarget.style.display = "none")} />
      ) : (
        <div style={{
          width: "100%", height: "100%",
          background: "radial-gradient(ellipse 90% 90% at 30% 50%, rgba(124,110,247,0.22) 0%, rgba(10,132,255,0.08) 50%, transparent 100%), var(--bg-elevated)",
        }} />
      )}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to bottom, rgba(8,8,16,0.45) 0%, transparent 35%, rgba(8,8,16,0.7) 70%, rgba(8,8,16,0.96) 100%)",
      }} />

      <div style={{ position: "absolute", top: 12, left: 14, right: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button className={`task-check ${isDone ? "done" : ""}`} onClick={toggleTaskStatus} style={{ backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}>
          {isDone && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
        </button>
        <div style={{ display: "flex", gap: 6 }}>
          <div ref={moveMenuRef} style={{ position: "relative" }}>
            <button
              onClick={() => setShowMoveMenu((v) => !v)}
              disabled={moving}
              title="Move to another view"
              style={{
                background: showMoveMenu ? "rgba(124,110,247,0.35)" : "rgba(255,255,255,0.12)",
                backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
                border: `1px solid ${showMoveMenu ? "rgba(124,110,247,0.5)" : "rgba(255,255,255,0.18)"}`,
                borderRadius: 8, padding: "5px 10px",
                color: showMoveMenu ? "var(--accent-hover)" : "var(--text-primary)",
                fontSize: "0.75rem", fontWeight: 600, cursor: moving ? "default" : "pointer",
                display: "flex", alignItems: "center", gap: 5,
                transition: "all var(--transition-fast)",
              }}
            >
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 6h8M7 3l3 3-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
              {moving ? "Moving…" : "Move"}
            </button>

            {showMoveMenu && (
              <div style={{
                position: "absolute", top: "100%", right: 0, marginTop: 6, zIndex: 20,
                width: 160,
                background: "var(--bg-elevated)",
                border: "1px solid var(--glass-border-strong)",
                borderRadius: "var(--radius-md)",
                boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
                overflow: "hidden",
              }}>
                {MOVE_TARGETS.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => moveTask(t.key)}
                    style={{
                      width: "100%", textAlign: "left",
                      background: "transparent", border: "none",
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                      padding: "8px 12px", cursor: "pointer",
                      color: "var(--text-primary)", fontSize: "0.82rem",
                      transition: "background var(--transition-fast)",
                    }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "var(--bg-hover)")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "transparent")}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => setEditMode((m) => !m)} style={{
            background: editMode ? "rgba(124,110,247,0.35)" : "rgba(255,255,255,0.12)",
            backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
            border: `1px solid ${editMode ? "rgba(124,110,247,0.5)" : "rgba(255,255,255,0.18)"}`,
            borderRadius: 8, padding: "5px 10px",
            color: editMode ? "var(--accent-hover)" : "var(--text-primary)",
            fontSize: "0.75rem", fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 5,
            transition: "all var(--transition-fast)",
          }}>
            {editMode ? (<><svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>Done</>) : (<><svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M8.5 1.5a1.5 1.5 0 0 1 2.12 2.12L4 10.25l-2.75.5.5-2.75L8.5 1.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>Edit</>)}
          </button>
          <button onClick={onClose} style={{
            background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.18)", borderRadius: 8, width: 30, height: 30,
            color: "var(--text-secondary)", fontSize: 17, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>×</button>
        </div>
      </div>

      {!editMode && (
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "0 20px 18px" }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
            {task.priority !== "none" && <Chip bg={pChip.bg} border={pChip.border} color={pChip.color}>{pChip.label}</Chip>}
            <Chip bg={sChip.bg} border={sChip.border} color={sChip.color}>{sChip.label}</Chip>
            {task.dueDate && <Chip bg="rgba(255,255,255,0.08)" border="rgba(255,255,255,0.15)" color="var(--text-secondary)">{formatDateShort(task.dueDate)}</Chip>}
            {task.isSomeday && <Chip bg="rgba(124,110,247,0.15)" border="rgba(124,110,247,0.3)" color="var(--accent-hover)">Someday</Chip>}
            {task.isUpcoming && <Chip bg="rgba(10,132,255,0.15)" border="rgba(10,132,255,0.3)" color="var(--info)">Upcoming</Chip>}
          </div>
          <h2 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, lineHeight: 1.3, color: isDone ? "var(--text-muted)" : "var(--text-primary)", textDecoration: isDone ? "line-through" : "none", textShadow: "0 1px 8px rgba(0,0,0,0.6)" }}>
            {task.title}
          </h2>
        </div>
      )}
    </div>
  );

  // ── Edit fields ──────────────────────────────────────────────────────────────

  const editFields = (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 20 }}>
      <div>
        <label className="input-label">Title</label>
        <input className="input" value={task.title} onChange={(e) => setTask((t) => ({ ...t, title: e.target.value }))} onBlur={() => patch({ title: task.title })} />
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 120 }}>
          <label className="input-label">Priority</label>
          <select className="input" value={task.priority} onChange={(e) => patch({ priority: e.target.value as Task["priority"] })}>
            {PRIORITIES.map((p) => <option key={p} value={p}>{p === "none" ? "No priority" : p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
          </select>
        </div>
        <div style={{ flex: 1, minWidth: 120 }}>
          <label className="input-label">Status</label>
          <select className="input" value={task.status} onChange={(e) => patch({ status: e.target.value as Task["status"] })}>
            {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div style={{ flex: 1, minWidth: 120 }}>
          <label className="input-label">Due date</label>
          <input className="input" type="date" value={task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : ""} onChange={(e) => patch({ dueDate: e.target.value ? new Date(e.target.value).toISOString() : null })} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 16 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.82rem", color: "var(--text-secondary)", cursor: "pointer" }}>
          <input type="checkbox" checked={!!task.isSomeday} onChange={(e) => patch({ isSomeday: e.target.checked })} />Someday
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.82rem", color: "var(--text-secondary)", cursor: "pointer" }}>
          <input type="checkbox" checked={!!task.isUpcoming} onChange={(e) => patch({ isUpcoming: e.target.checked })} />Upcoming
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.82rem", color: "var(--text-secondary)", cursor: "pointer" }}>
          <input type="checkbox" checked={!!task.hideOverdue} onChange={(e) => patch({ hideOverdue: e.target.checked })} />Hide overdue
        </label>
      </div>
      <div>
        <label className="input-label">Cover image URL</label>
        <input className="input" type="url" placeholder="https://…" value={coverImage} onChange={(e) => setCoverImage(e.target.value)} onBlur={() => patch({ coverImage: coverImage.trim() || null })} />
        {coverImage && (
          <button onClick={() => { setCoverImage(""); patch({ coverImage: null }); }} style={{ marginTop: 6, background: "none", border: "none", color: "var(--danger)", fontSize: "0.78rem", cursor: "pointer", padding: 0 }}>
            Remove image
          </button>
        )}
      </div>
      <div>
        <label className="input-label">Notes</label>
        <textarea className="input" rows={4} placeholder="Add notes…" value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={() => patch({ notes })} style={{ resize: "vertical", fontFamily: "inherit" }} />
      </div>
    </div>
  );

  const viewContent = notes ? (
    <div style={{ marginBottom: 20, fontSize: "0.875rem", lineHeight: 1.65, color: "var(--text-secondary)", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{notes}</div>
  ) : (
    <div style={{ marginBottom: 20, fontSize: "0.82rem", color: "var(--text-muted)", fontStyle: "italic" }}>No notes</div>
  );

  // ── Subtasks ──────────────────────────────────────────────────────────────────

  const openSubs = subtasks.filter((s) => s.status !== "done" && s.status !== "cancelled");
  const doneSubs = subtasks.filter((s) => s.status === "done");

  // Bucket completed subtasks into fixed, always-visible windows — everything
  // older than "this week" is hidden behind the "See all closed" toggle so the
  // list doesn't grow unbounded as tasks accumulate completions over time.
  function closedBucket(sub: Task): "today" | "yesterday" | "week" | "older" {
    if (!sub.completedAt) return "older";
    const d = new Date(sub.completedAt);
    if (isToday(d)) return "today";
    if (isYesterday(d)) return "yesterday";
    if (isThisWeek(d, { weekStartsOn: 1 })) return "week";
    return "older";
  }

  const closedToday = doneSubs.filter((s) => closedBucket(s) === "today");
  const closedYesterday = doneSubs.filter((s) => closedBucket(s) === "yesterday");
  const closedThisWeek = doneSubs.filter((s) => closedBucket(s) === "week");
  const closedOlder = doneSubs.filter((s) => closedBucket(s) === "older");

  // Optimistically flips the row so the checkbox responds instantly, instead of
  // waiting on a PATCH + full subtask refetch chained one after another. Confirms
  // via toast once the PATCH actually lands, then reconciles the closed-today/
  // yesterday/week groupings against the server's completedAt. Reverts on failure.
  async function toggleSubStatus(sub: Task) {
    const prevSubtasks = subtasks;
    const next = sub.status === "done" ? "pending" : "done";
    setSubtasks((prev) => prev.map((s) => (s.id === sub.id ? { ...s, status: next } : s)));
    if (selectedSub?.id === sub.id) {
      setSelectedSub((s) => (s ? { ...s, status: next } : s));
    }
    try {
      const res = await fetch(`/api/tasks/${sub.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const d = await res.json();
      if (!res.ok || !d.ok) throw new Error(d.error ?? "Could not update subtask");
      toast(next === "done" ? "Subtask completed" : "Subtask reopened", { variant: "success" });
      refreshSubtasks();
    } catch (e) {
      setSubtasks(prevSubtasks);
      if (selectedSub?.id === sub.id) {
        setSelectedSub((s) => (s ? { ...s, status: sub.status } : s));
      }
      toast(e instanceof Error ? e.message : "Could not update subtask", { variant: "error" });
    }
  }

  function renderSubtaskRow(sub: Task) {
    const done = sub.status === "done";
    const isSelected = selectedSub?.id === sub.id;
    const subLabels = sub.labels ?? [];
    const pickerOpen = tagPickerSubId === sub.id;
    const movePickerOpen = movePickerSubId === sub.id;
    const hl = resolveHighlight(sub, referenceDate);
    return (
      <div key={sub.id} style={{ position: "relative" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "7px 4px", borderBottom: "1px solid var(--glass-border)",
          opacity: done ? 0.6 : 1,
          background: isSelected ? "rgba(124,110,247,0.06)" : hl ? hl.rowBg : "transparent",
          transition: "all var(--transition-fast)",
          borderRadius: isSelected || hl ? 6 : 0,
        }}>
          {/* Checkbox */}
          <button
            className={`task-check ${done ? "done" : ""}`}
            style={{ width: 17, height: 17, minWidth: 17, flexShrink: 0, ...(hl && !done ? { borderColor: hl.checkBorderColor } : {}) }}
            onClick={() => toggleSubStatus(sub)}
          >
            {done && <svg width="8" height="6" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
          </button>

          {/* Title */}
          <span
            onClick={() => openSub(sub)}
            style={{
              flex: 1, fontSize: "0.875rem",
              color: done ? "var(--text-muted)" : isSelected ? "var(--accent-hover)" : hl ? hl.textColor : "var(--text-primary)",
              fontWeight: hl && !done ? 500 : 400,
              textDecoration: done ? "line-through" : "none",
              cursor: "pointer", transition: "color var(--transition-fast)",
            }}
          >
            {sub.title}
          </span>

          {/* Completed-when label */}
          {done && sub.completedAt && (
            <span
              title={formatDateTime(sub.completedAt)}
              style={{ fontSize: "0.68rem", color: "var(--text-muted)", flexShrink: 0, whiteSpace: "nowrap" }}
            >
              {timeAgo(sub.completedAt)}
            </span>
          )}

          {/* Label pills */}
          {subLabels.map((lbl) => (
            <span key={lbl.labelId} style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "2px 7px", borderRadius: "var(--radius-full)",
              fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.02em",
              background: `${lbl.color}22`,
              border: `1px solid ${lbl.color}55`,
              color: lbl.color,
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: lbl.color, display: "inline-block" }} />
              {lbl.name}
            </span>
          ))}

          {/* Add tag button */}
          {!done && (
            <button
              onClick={(e) => { e.stopPropagation(); setTagPickerSubId(pickerOpen ? null : sub.id); setMovePickerSubId(null); }}
              title="Add tag"
              style={{
                width: 20, height: 20, borderRadius: 4, border: "1px dashed var(--glass-border)",
                background: "transparent", color: "var(--text-muted)", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "0.75rem", flexShrink: 0, lineHeight: 1,
                transition: "all var(--transition-fast)",
              }}
            >
              #
            </button>
          )}

          {/* Move to button */}
          {!done && (
            <button
              onClick={(e) => { e.stopPropagation(); setMovePickerSubId(movePickerOpen ? null : sub.id); setTagPickerSubId(null); }}
              title="Move to another task"
              style={{
                width: 20, height: 20, borderRadius: 4, border: "1px dashed var(--glass-border)",
                background: movePickerOpen ? "var(--accent-dim)" : "transparent",
                color: movePickerOpen ? "var(--accent-hover)" : "var(--text-muted)",
                cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
                transition: "all var(--transition-fast)",
              }}
            >
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                <path d="M2 6h8M7 3l3 3-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}

          {/* "new" highlight badge */}
          {hl?.badgeLabel && (
            <span style={{
              fontSize: "0.6rem", fontWeight: 700, padding: "2px 6px",
              borderRadius: "var(--radius-full)", flexShrink: 0,
              color: hl.badgeColor, background: hl.badgeBg, border: `1px solid ${hl.badgeBorder}`,
            }}>
              {hl.badgeLabel}
            </span>
          )}

          {/* Open panel indicator */}
          <span style={{ fontSize: "0.65rem", color: isSelected ? "var(--accent)" : "var(--text-muted)", opacity: isSelected ? 1 : 0, transition: "opacity var(--transition-fast)", paddingRight: 4 }}>
            ›
          </span>
        </div>

        {/* Tag picker popover */}
        {pickerOpen && (
          <SubtaskTagPicker
            taskId={sub.id}
            current={subLabels.map((l) => ({ id: l.labelId, name: l.name, color: l.color }))}
            onUpdate={(updated) => {
              setSubtasks((prev) => prev.map((s) =>
                s.id === sub.id
                  ? { ...s, labels: updated.map((u) => ({ labelId: u.id, name: u.name, color: u.color })) }
                  : s
              ));
            }}
            onClose={() => setTagPickerSubId(null)}
          />
        )}

        {/* Move picker popover */}
        {movePickerOpen && (
          <SubtaskMovePicker
            subtaskId={sub.id}
            currentParentId={task.id}
            onMoved={refreshSubtasks}
            onClose={() => setMovePickerSubId(null)}
          />
        )}
      </div>
    );
  }

  function ClosedGroupHeader({ label, count }: { label: string; count: number }) {
    return (
      <div style={{
        display: "flex", alignItems: "baseline", gap: 6, margin: "12px 0 2px",
        fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.06em",
        textTransform: "uppercase", color: "var(--text-muted)",
      }}>
        {label} <span style={{ opacity: 0.6, textTransform: "none", letterSpacing: 0 }}>({count})</span>
      </div>
    );
  }

  const hasClosed = closedToday.length > 0 || closedYesterday.length > 0 || closedThisWeek.length > 0 || closedOlder.length > 0;

  const subtasksSection = (
    <div style={{ marginBottom: 20 }}>
      <div className="section-header" style={{ marginBottom: 8 }}>
        <span>↳</span> Subtasks ({openSubs.length})
      </div>

      <div>
        {openSubs.map(renderSubtaskRow)}
        <AddTaskInline parentId={task.id} listId={task.listId ?? undefined} onCreated={refreshSubtasks} />
      </div>

      {hasClosed && (
        <div>
          {closedToday.length > 0 && (<>
            <ClosedGroupHeader label="Closed today" count={closedToday.length} />
            {closedToday.map(renderSubtaskRow)}
          </>)}
          {closedYesterday.length > 0 && (<>
            <ClosedGroupHeader label="Closed yesterday" count={closedYesterday.length} />
            {closedYesterday.map(renderSubtaskRow)}
          </>)}
          {closedThisWeek.length > 0 && (<>
            <ClosedGroupHeader label="Closed this week" count={closedThisWeek.length} />
            {closedThisWeek.map(renderSubtaskRow)}
          </>)}
          {showAllClosed && closedOlder.length > 0 && (<>
            <ClosedGroupHeader label="Closed earlier" count={closedOlder.length} />
            {closedOlder.map(renderSubtaskRow)}
          </>)}
          {!showAllClosed && closedOlder.length > 0 && (
            <button onClick={() => setShowAllClosed(true)} style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              marginTop: 10, padding: "4px 11px", borderRadius: "var(--radius-full)",
              border: "1px solid var(--glass-border)", background: "transparent",
              color: "var(--text-muted)", fontSize: "0.72rem", fontWeight: 500, cursor: "pointer",
              transition: "all var(--transition-fast)",
            }}>
              See all closed ({closedOlder.length})
            </button>
          )}
        </div>
      )}
    </div>
  );

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="modal slide-up"
        style={{
          maxWidth: selectedSub ? 920 : 580,
          width: "calc(100vw - 48px)",
          padding: 0, overflow: "hidden",
          display: "flex", flexDirection: "row",
          transition: "max-width 300ms cubic-bezier(0.34,1.2,0.64,1)",
        }}
      >
        {/* Left: main task panel */}
        <div style={{ flex: "0 0 580px", minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {hero}
          <div style={{ padding: "20px 24px 24px", overflowY: "auto", flex: 1 }}>
            {editMode ? editFields : viewContent}
            {!editMode && subtasksSection}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 4 }}>
              <button className="btn btn-danger btn-sm" onClick={() => setConfirmDelete(true)} disabled={deleting}>
                {deleting ? "Deleting…" : "Delete"}
              </button>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                {saving ? "Saving…" : "Changes auto-saved"}
              </span>
            </div>
          </div>
        </div>

        {/* Right: subtask detail panel (slides in) */}
        {selectedSub && (
          <SubtaskDetailPanel
            sub={selectedSub}
            onClose={closeSub}
            onRefresh={refreshSubtasks}
          />
        )}
      </div>

      {confirmDelete && (
        <ConfirmDialog
          title="Delete this task?"
          message="This will permanently remove the task and all its subtasks. This cannot be undone."
          confirmLabel="Delete"
          cancelLabel="Cancel"
          variant="danger"
          onConfirm={deleteTask}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}
