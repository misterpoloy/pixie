"use client";

import { useState, useCallback } from "react";
import TaskItem from "@/components/tasks/TaskItem";
import TaskDetailModal from "@/components/tasks/TaskDetailModal";

interface Task {
  id: string;
  title: string;
  status: "pending" | "in_progress" | "done" | "cancelled";
  priority: "none" | "low" | "medium" | "high";
  dueDate?: string | null;
  isSomeday?: boolean;
}

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [openTask, setOpenTask] = useState<Task | null>(null);

  const search = useCallback(async (query: string) => {
    if (!query.trim()) { setResults([]); setSearched(false); return; }
    setLoading(true);
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    if (data.ok) setResults(data.data.tasks);
    setLoading(false);
    setSearched(true);
  }, []);

  return (
    <>
      <h1 className="page-title">Search</h1>
      <div style={{ marginBottom: 24 }}>
        <input
          className="input"
          type="search"
          placeholder="Search tasks and notes…"
          value={q}
          autoFocus
          onChange={(e) => {
            setQ(e.target.value);
            const val = e.target.value;
            const t = setTimeout(() => search(val), 300);
            return () => clearTimeout(t);
          }}
          style={{ fontSize: "1rem" }}
        />
      </div>

      {loading && <p style={{ color: "var(--text-muted)" }}>Searching…</p>}

      {searched && !loading && results.length === 0 && (
        <p style={{ color: "var(--text-muted)", textAlign: "center", padding: "40px 0" }}>
          No results for &ldquo;{q}&rdquo;
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {results.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            onOpen={setOpenTask}
            onRefresh={() => search(q)}
          />
        ))}
      </div>

      {openTask && (
        <TaskDetailModal
          task={openTask}
          onClose={() => { setOpenTask(null); search(q); }}
        />
      )}
    </>
  );
}
