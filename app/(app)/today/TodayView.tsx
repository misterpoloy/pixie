"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import DraggableCardGrid from "@/components/tasks/DraggableCardGrid";
import TaskItem from "@/components/tasks/TaskItem";
import AddTaskInline from "@/components/tasks/AddTaskInline";
import TaskDetailModal from "@/components/tasks/TaskDetailModal";
import RightBar from "@/components/layout/RightBar";
import NavRail from "@/components/layout/NavRail";
import MiniCalendar from "@/components/widgets/MiniCalendar";
import WorldClock from "@/components/widgets/WorldClock";
import ViewToggle, { type ViewMode } from "@/components/ui/ViewToggle";
import Bitacora from "@/components/bitacora/Bitacora";

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
  createdAt?: string;
  completedAt?: string | null;
  parentId?: string | null;
  subtasks?: Task[];
}

function nestTasks(flat: Task[]): Task[] {
  const map = new Map<string, Task>();
  flat.forEach((t) => map.set(t.id, { ...t, subtasks: [] }));
  const roots: Task[] = [];
  map.forEach((task) => {
    if (task.parentId && map.has(task.parentId)) {
      map.get(task.parentId)!.subtasks!.push(task);
    } else {
      roots.push(task);
    }
  });
  return roots;
}

// Derive a human-readable header label + subtitle from a YYYY-MM-DD date
function deriveDateLabel(dateYMD: string, todayYMD: string): { heading: string; subtitle: string } {
  const d = new Date(`${dateYMD}T12:00:00`); // noon avoids DST edge
  const heading = d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  const diff = Math.round(
    (new Date(`${dateYMD}T12:00:00`).getTime() - new Date(`${todayYMD}T12:00:00`).getTime()) / 86_400_000
  );

  let subtitle = "Today";
  if (diff === -1) subtitle = "Yesterday";
  else if (diff === 1) subtitle = "Tomorrow";
  else if (diff < -1) subtitle = `${Math.abs(diff)} days ago`;
  else if (diff > 1)  subtitle = `In ${diff} days`;

  return { heading, subtitle };
}

export default function TodayView({ dateStr, localDate }: { dateStr: string; localDate: string }) {
  const [tasks, setTasks]       = useState<Task[]>([]);
  const [loading, setLoading]   = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [openTask, setOpenTask] = useState<Task | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showClock, setShowClock]       = useState(false);
  const [showClosedToday, setShowClosedToday]       = useState(true);
  const [showClosedThisWeek, setShowClosedThisWeek] = useState(false);

  // The currently selected calendar date — drives task fetch, highlights, bitacora
  const [selectedDate, setSelectedDate] = useState(localDate);

  const { heading, subtitle } = deriveDateLabel(selectedDate, localDate);
  const isToday = selectedDate === localDate;

  // Persist view preference
  useEffect(() => {
    const saved = localStorage.getItem("pixie:today:view") as ViewMode | null;
    if (saved === "card" || saved === "list") setViewMode(saved);
  }, []);

  function changeView(m: ViewMode) {
    setViewMode(m);
    localStorage.setItem("pixie:today:view", m);
  }

  const load = useCallback(async () => {
    setLoading(true);
    // Always use ?date= so the API handles today vs past correctly
    const res = await fetch(`/api/tasks?date=${selectedDate}`);
    const data = await res.json();
    if (data.ok) setTasks(nestTasks(data.data));
    setLoading(false);
  }, [selectedDate]);

  useEffect(() => {
    load();
    // Snapshot only on "today" view
    if (isToday) {
      fetch("/api/snapshot", {
        method: "POST",
        headers: { "x-local-date": localDate },
      }).catch(() => {});
    }
  }, [load, isToday, localDate]);

  function handleToggle(id: string, done: boolean) {
    setTasks((prev) =>
      prev.map((t) => t.id === id ? { ...t, status: done ? "done" : "pending" } : t)
    );
  }

  void handleToggle; // used only in list view via TaskItem

  const pending = tasks.filter((t) => t.status !== "done" && t.status !== "cancelled" && !t.isSomeday && !t.isUpcoming);
  const done    = tasks.filter((t) => t.status === "done"  && !t.isSomeday && !t.isUpcoming);

  function handleSelectDate(date: string) {
    setSelectedDate(date);
    // Auto-open calendar panel if not already open
    if (!showCalendar) setShowCalendar(true);
  }

  function shiftDay(delta: number) {
    const d = new Date(`${selectedDate}T12:00:00`);
    d.setDate(d.getDate() + delta);
    setSelectedDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  }

  return (
    <>
      {/* Page header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: 4 }}>{heading}</h1>
          <p style={{
            margin: 0, fontSize: "1.1rem", fontWeight: 600,
            color: isToday ? "var(--accent-hover)" : "var(--text-secondary)",
            letterSpacing: "-0.01em",
          }}>
            {subtitle}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Day navigation */}
          <div style={{
            display: "flex", alignItems: "center",
            background: "var(--bg-card)", borderRadius: "var(--radius-sm)",
            border: "1px solid var(--glass-border)", overflow: "hidden",
          }}>
            <button
              onClick={() => shiftDay(-1)}
              aria-label="Previous day"
              title="Previous day"
              style={{
                background: "none", border: "none", borderRight: "1px solid var(--glass-border)",
                cursor: "pointer", color: "var(--text-muted)",
                padding: "6px 10px", display: "flex", alignItems: "center", lineHeight: 1,
                transition: "background 0.12s, color 0.12s",
              }}
              onMouseEnter={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.background = "var(--glass-hover)"; b.style.color = "var(--text-primary)"; }}
              onMouseLeave={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.background = "none"; b.style.color = "var(--text-muted)"; }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M9 11L5 7L9 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <button
              onClick={() => setSelectedDate(localDate)}
              aria-label="Go to today"
              title="Go to today"
              style={{
                background: isToday ? "var(--accent-dim)" : "none",
                border: "none", borderRight: "1px solid var(--glass-border)",
                cursor: isToday ? "default" : "pointer",
                color: isToday ? "var(--accent-hover)" : "var(--text-muted)",
                padding: "6px 12px", fontSize: "0.75rem", fontWeight: 600,
                letterSpacing: "0.02em", lineHeight: 1,
                transition: "background 0.12s, color 0.12s",
              }}
              onMouseEnter={(e) => { if (!isToday) { const b = e.currentTarget as HTMLButtonElement; b.style.background = "var(--glass-hover)"; b.style.color = "var(--text-primary)"; } }}
              onMouseLeave={(e) => { if (!isToday) { const b = e.currentTarget as HTMLButtonElement; b.style.background = "none"; b.style.color = "var(--text-muted)"; } }}
            >
              Today
            </button>

            <button
              onClick={() => shiftDay(1)}
              aria-label="Next day"
              title="Next day"
              style={{
                background: "none", border: "none",
                cursor: "pointer", color: "var(--text-muted)",
                padding: "6px 10px", display: "flex", alignItems: "center", lineHeight: 1,
                transition: "background 0.12s, color 0.12s",
              }}
              onMouseEnter={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.background = "var(--glass-hover)"; b.style.color = "var(--text-primary)"; }}
              onMouseLeave={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.background = "none"; b.style.color = "var(--text-muted)"; }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M5 3L9 7L5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          {viewMode === "card" && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button
                onClick={() => setShowClosedToday((v) => !v)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "5px 11px", borderRadius: "var(--radius-full)",
                  border: "1px solid var(--glass-border)",
                  background: showClosedToday ? "var(--accent-dim)" : "transparent",
                  color: showClosedToday ? "var(--accent-hover)" : "var(--text-muted)",
                  fontSize: "0.75rem", fontWeight: 500, cursor: "pointer",
                  transition: "all var(--transition-fast)",
                }}
              >
                Closed today
              </button>
              <button
                onClick={() => setShowClosedThisWeek((v) => !v)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "5px 11px", borderRadius: "var(--radius-full)",
                  border: "1px solid var(--glass-border)",
                  background: showClosedThisWeek ? "var(--accent-dim)" : "transparent",
                  color: showClosedThisWeek ? "var(--accent-hover)" : "var(--text-muted)",
                  fontSize: "0.75rem", fontWeight: 500, cursor: "pointer",
                  transition: "all var(--transition-fast)",
                }}
              >
                Closed this week
              </button>
            </div>
          )}

          <ViewToggle mode={viewMode} onChange={changeView} />
        </div>
      </div>

      {loading && (
        <div style={{ color: "var(--text-muted)", fontSize: "0.875rem", padding: "12px 0" }}>Loading…</div>
      )}

      {!loading && pending.length === 0 && done.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-muted)", fontSize: "0.9rem" }}>
          {isToday ? "Nothing due today — enjoy your day ✨" : "No tasks found for this date."}
        </div>
      )}

      {/* ── Card view ─────────────────────────────────────────── */}
      {viewMode === "card" && !loading && (
        <>
          <DraggableCardGrid
            tasks={pending}
            onOpen={setOpenTask}
            referenceDate={selectedDate}
            showClosedToday={showClosedToday}
            showClosedThisWeek={showClosedThisWeek}
          />

          {done.length > 0 && (
            <details style={{ marginTop: 28 }}>
              <summary className="section-header" style={{ listStyle: "none", cursor: "pointer" }}>
                <span>✓</span> Completed ({done.length})
              </summary>
              <div style={{ marginTop: 12, opacity: 0.5 }}>
                <DraggableCardGrid
                  tasks={done}
                  onOpen={setOpenTask}
                  referenceDate={selectedDate}
                  showClosedToday={showClosedToday}
                  showClosedThisWeek={showClosedThisWeek}
                />
              </div>
            </details>
          )}

          {isToday && (
            <div style={{ marginTop: 20 }}>
              <AddTaskInline defaults={{ dueDate: new Date().toISOString() }} onCreated={load} />
            </div>
          )}
        </>
      )}

      {/* ── List view ─────────────────────────────────────────── */}
      {viewMode === "list" && !loading && (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {pending.map((task) => (
              <TaskItem key={task.id} task={task} onOpen={setOpenTask} onRefresh={load} />
            ))}
          </div>

          {isToday && (
            <AddTaskInline defaults={{ dueDate: new Date().toISOString() }} onCreated={load} />
          )}

          {done.length > 0 && (
            <details style={{ marginTop: 20 }}>
              <summary className="section-header" style={{ listStyle: "none", cursor: "pointer" }}>
                <span>✓</span> Completed ({done.length})
              </summary>
              <div style={{ opacity: 0.5, marginTop: 8 }}>
                {done.map((task) => (
                  <TaskItem key={task.id} task={task} onOpen={setOpenTask} onRefresh={load} />
                ))}
              </div>
            </details>
          )}
        </>
      )}

      {openTask && (
        <Suspense>
          <TaskDetailModal
            task={openTask}
            referenceDate={selectedDate}
            onClose={() => { setOpenTask(null); load(); }}
          />
        </Suspense>
      )}

      {/* ── Bitacora: filtered to selected date ───────────────── */}
      <Bitacora dateStr={selectedDate} />

      <NavRail
        showCalendar={showCalendar}
        onCalendar={() => setShowCalendar((v) => !v)}
        showClock={showClock}
        onClock={() => setShowClock((v) => !v)}
      />

      {(showCalendar || showClock) && (
        <RightBar>
          {showCalendar && (
            <MiniCalendar
              selectedDate={selectedDate}
              onSelect={(date) => setSelectedDate(date)}
            />
          )}
          {showClock && <WorldClock />}
        </RightBar>
      )}
    </>
  );
}
