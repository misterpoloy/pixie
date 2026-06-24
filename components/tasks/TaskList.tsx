"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import TaskItem from "./TaskItem";
import DraggableCardGrid from "./DraggableCardGrid";
import AddTaskInline from "./AddTaskInline";
import TaskDetailModal from "./TaskDetailModal";
import ViewToggle, { type ViewMode } from "@/components/ui/ViewToggle";

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
  updatedAt?: string;
  updatedBy?: string | null;
  parentId?: string | null;
  subtasks?: Task[];
}

interface Props {
  apiUrl: string;
  emptyMessage?: string;
  showAdd?: boolean;
  addDefaults?: Record<string, unknown>;
  metaMode?: "default" | "upcoming";
  title?: string;
  subtitle?: string;
  viewToggle?: boolean;
  storageKey?: string;
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

export default function TaskList({
  apiUrl,
  emptyMessage,
  showAdd = true,
  addDefaults,
  metaMode = "default",
  title,
  subtitle,
  viewToggle = false,
  storageKey,
}: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [openTask, setOpenTask] = useState<Task | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  // Restore saved view mode after hydration
  useEffect(() => {
    if (!viewToggle || !storageKey) return;
    const saved = localStorage.getItem(storageKey);
    if (saved === "card" || saved === "list") setViewMode(saved);
  }, [viewToggle, storageKey]);

  function handleViewChange(m: ViewMode) {
    setViewMode(m);
    if (storageKey) localStorage.setItem(storageKey, m);
  }

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(apiUrl);
    const data = await res.json();
    if (data.ok) setTasks(nestTasks(data.data));
    setLoading(false);
  }, [apiUrl]);

  useEffect(() => { load(); }, [load]);

  const pending = tasks.filter((t) => t.status !== "done" && t.status !== "cancelled");
  const done = tasks.filter((t) => t.status === "done");

  return (
    <div>
      {/* Header row: title/subtitle + optional view toggle */}
      {(title || viewToggle) && (
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            {title && <h1 className="page-title" style={{ marginBottom: subtitle ? 4 : 0 }}>{title}</h1>}
            {subtitle && <p className="page-subtitle" style={{ margin: 0 }}>{subtitle}</p>}
          </div>
          {viewToggle && (
            <ViewToggle mode={viewMode} onChange={handleViewChange} />
          )}
        </div>
      )}

      {loading && (
        <div style={{ color: "var(--text-muted)", fontSize: "0.875rem", padding: "12px 0" }}>
          Loading…
        </div>
      )}

      {!loading && pending.length === 0 && done.length === 0 && (
        <div style={{
          textAlign: "center", padding: "60px 0",
          color: "var(--text-muted)", fontSize: "0.9rem",
        }}>
          {emptyMessage ?? "No tasks yet."}
        </div>
      )}

      {/* Pending tasks */}
      {viewMode === "card" ? (
        <DraggableCardGrid tasks={pending} onOpen={setOpenTask} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {pending.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              metaMode={metaMode}
              onOpen={setOpenTask}
              onRefresh={load}
            />
          ))}
        </div>
      )}

      {showAdd && (
        <AddTaskInline defaults={addDefaults} onCreated={load} />
      )}

      {done.length > 0 && (
        <details style={{ marginTop: 20 }}>
          <summary className="section-header" style={{ listStyle: "none", cursor: "pointer" }}>
            <span>✓</span>
            Completed ({done.length})
          </summary>
          <div style={{ opacity: 0.5, marginTop: 8 }}>
            {viewMode === "card" ? (
              <DraggableCardGrid tasks={done} onOpen={setOpenTask} />
            ) : (
              done.map((task) => (
                <TaskItem key={task.id} task={task} metaMode={metaMode} onOpen={setOpenTask} onRefresh={load} />
              ))
            )}
          </div>
        </details>
      )}

      {openTask && (
        <Suspense>
          <TaskDetailModal
            task={openTask}
            onClose={() => { setOpenTask(null); load(); }}
          />
        </Suspense>
      )}
    </div>
  );
}
