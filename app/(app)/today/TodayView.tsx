"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import TaskCard from "@/components/tasks/TaskCard";
import TaskItem from "@/components/tasks/TaskItem";
import AddTaskInline from "@/components/tasks/AddTaskInline";
import TaskDetailModal from "@/components/tasks/TaskDetailModal";
import RightBar from "@/components/layout/RightBar";
import MiniCalendar from "@/components/widgets/MiniCalendar";
import WorldClock from "@/components/widgets/WorldClock";

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

type ViewMode = "list" | "card";

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

function ViewToggle({ mode, onChange }: { mode: ViewMode; onChange: (m: ViewMode) => void }) {
  return (
    <div style={{ display: "flex", gap: 4, background: "var(--bg-card)", borderRadius: "var(--radius-sm)", padding: 3, border: "1px solid var(--glass-border)" }}>
      <button
        onClick={() => onChange("list")}
        title="List view"
        style={{
          background: mode === "list" ? "var(--bg-active)" : "transparent",
          border: "none", borderRadius: 6, padding: "5px 8px",
          cursor: "pointer", color: mode === "list" ? "var(--text-primary)" : "var(--text-muted)",
          transition: "all var(--transition-fast)", display: "flex", alignItems: "center",
        }}
      >
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
          <rect x="1" y="3" width="13" height="1.5" rx="0.75" fill="currentColor" />
          <rect x="1" y="7" width="13" height="1.5" rx="0.75" fill="currentColor" />
          <rect x="1" y="11" width="13" height="1.5" rx="0.75" fill="currentColor" />
        </svg>
      </button>
      <button
        onClick={() => onChange("card")}
        title="Card view"
        style={{
          background: mode === "card" ? "var(--bg-active)" : "transparent",
          border: "none", borderRadius: 6, padding: "5px 8px",
          cursor: "pointer", color: mode === "card" ? "var(--text-primary)" : "var(--text-muted)",
          transition: "all var(--transition-fast)", display: "flex", alignItems: "center",
        }}
      >
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
          <rect x="1" y="1" width="5.5" height="5.5" rx="1.5" fill="currentColor" />
          <rect x="8.5" y="1" width="5.5" height="5.5" rx="1.5" fill="currentColor" />
          <rect x="1" y="8.5" width="5.5" height="5.5" rx="1.5" fill="currentColor" />
          <rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1.5" fill="currentColor" />
        </svg>
      </button>
    </div>
  );
}

export default function TodayView({ dateStr }: { dateStr: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [openTask, setOpenTask] = useState<Task | null>(null);

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
      {/* Page header with toggle */}
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
          {pending.length > 0 && (
            <div className="task-card-grid">
              {pending.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onOpen={setOpenTask}
                  onToggle={handleToggle}
                />
              ))}
            </div>
          )}

          {done.length > 0 && (
            <details style={{ marginTop: 28 }}>
              <summary className="section-header" style={{ listStyle: "none", cursor: "pointer" }}>
                <span>✓</span> Completed ({done.length})
              </summary>
              <div className="task-card-grid" style={{ marginTop: 12, opacity: 0.5 }}>
                {done.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onOpen={setOpenTask}
                    onToggle={handleToggle}
                  />
                ))}
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

      <RightBar>
        <MiniCalendar />
        <WorldClock />
      </RightBar>
    </>
  );
}
