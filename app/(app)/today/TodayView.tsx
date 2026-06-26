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


export default function TodayView({ dateStr, localDate }: { dateStr: string; localDate: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [openTask, setOpenTask] = useState<Task | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showClock, setShowClock] = useState(false);

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
    const res = await fetch("/api/tasks?view=today");
    const data = await res.json();
    if (data.ok) setTasks(nestTasks(data.data));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    // Snapshot today's open tasks for historical carry-forward tracking.
    // Fire-and-forget — never blocks the UI. Idempotent via ON CONFLICT DO NOTHING.
    const localDate = new Date().toISOString().slice(0, 10);
    fetch("/api/snapshot", {
      method: "POST",
      headers: { "x-local-date": localDate },
    }).catch(() => {});
  }, [load]);

  function handleToggle(id: string, done: boolean) {
    setTasks((prev) =>
      prev.map((t) => t.id === id ? { ...t, status: done ? "done" : "pending" } : t)
    );
  }

  const pending = tasks.filter((t) => t.status !== "done" && t.status !== "cancelled" && !t.isSomeday && !t.isUpcoming);
  const done = tasks.filter((t) => t.status === "done" && !t.isSomeday && !t.isUpcoming);

  return (
    <>
      {/* Page header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: 4 }}>{dateStr}</h1>
          <p style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600, color: "var(--accent-hover)", letterSpacing: "-0.01em" }}>Today</p>
        </div>
        <ViewToggle mode={viewMode} onChange={changeView} />
      </div>

      {loading && (
        <div style={{ color: "var(--text-muted)", fontSize: "0.875rem", padding: "12px 0" }}>
          Loading…
        </div>
      )}

      {!loading && pending.length === 0 && done.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-muted)", fontSize: "0.9rem" }}>
          Nothing due today — enjoy your day ✨
        </div>
      )}

      {/* ── Card view ────────────────────────────────────────── */}
      {viewMode === "card" && !loading && (
        <>
          <DraggableCardGrid tasks={pending} onOpen={setOpenTask} />

          {done.length > 0 && (
            <details style={{ marginTop: 28 }}>
              <summary className="section-header" style={{ listStyle: "none", cursor: "pointer" }}>
                <span>✓</span> Completed ({done.length})
              </summary>
              <div style={{ marginTop: 12, opacity: 0.5 }}>
                <DraggableCardGrid tasks={done} onOpen={setOpenTask} />
              </div>
            </details>
          )}

          <div style={{ marginTop: 20 }}>
            <AddTaskInline defaults={{ dueDate: new Date().toISOString() }} onCreated={load} />
          </div>
        </>
      )}

      {/* ── List view ────────────────────────────────────────── */}
      {viewMode === "list" && !loading && (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {pending.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onOpen={setOpenTask}
                onRefresh={load}
              />
            ))}
          </div>

          <AddTaskInline defaults={{ dueDate: new Date().toISOString() }} onCreated={load} />

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
            onClose={() => { setOpenTask(null); load(); }}
          />
        </Suspense>
      )}

      {/* ── Bitacora daily log ──────────────────────────────── */}
      <Bitacora dateStr={localDate} />

      <NavRail
        showCalendar={showCalendar}
        onCalendar={() => setShowCalendar((v) => !v)}
        showClock={showClock}
        onClock={() => setShowClock((v) => !v)}
      />

      {(showCalendar || showClock) && (
        <RightBar>
          {showCalendar && <MiniCalendar />}
          {showClock && <WorldClock />}
        </RightBar>
      )}
    </>
  );
}
