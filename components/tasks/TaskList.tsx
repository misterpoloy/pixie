"use client";

import { useCallback, useEffect, useState } from "react";
import TaskItem from "./TaskItem";
import AddTaskInline from "./AddTaskInline";
import TaskDetailModal from "./TaskDetailModal";

interface Task {
  id: string;
  title: string;
  status: "pending" | "in_progress" | "done" | "cancelled";
  priority: "none" | "low" | "medium" | "high";
  dueDate?: string | null;
  isSomeday?: boolean;
  isUpcoming?: boolean;
  createdAt?: string;
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
}: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [openTask, setOpenTask] = useState<Task | null>(null);

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
      {title && <h2 className="page-title">{title}</h2>}

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
            {done.map((task) => (
              <TaskItem key={task.id} task={task} metaMode={metaMode} onOpen={setOpenTask} onRefresh={load} />
            ))}
          </div>
        </details>
      )}

      {openTask && (
        <TaskDetailModal
          task={openTask}
          onClose={() => { setOpenTask(null); load(); }}
        />
      )}
    </div>
  );
}
