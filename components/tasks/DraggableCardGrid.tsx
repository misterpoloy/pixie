"use client";

import { useEffect, useRef, useState } from "react";
import TaskCard from "./TaskCard";

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
  subtasks?: Task[];
}

interface Props {
  tasks: Task[];
  onOpen: (task: Task) => void;
  referenceDate?: string;
  showClosedToday?: boolean;
  showClosedThisWeek?: boolean;
}

export default function DraggableCardGrid({ tasks: propTasks, onOpen, referenceDate, showClosedToday, showClosedThisWeek }: Props) {
  const [tasks, setTasks] = useState(propTasks);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync when parent re-fetches (e.g. after adding a task)
  useEffect(() => { setTasks(propTasks); }, [propTasks]);

  function onDragStart(i: number) {
    setDragIndex(i);
  }

  function onDragOver(e: React.DragEvent, i: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (i !== dropIndex) setDropIndex(i);
  }

  function onDrop(e: React.DragEvent, i: number) {
    e.preventDefault();
    if (dragIndex === null || dragIndex === i) {
      setDragIndex(null);
      setDropIndex(null);
      return;
    }

    const next = [...tasks];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(i, 0, moved);
    setTasks(next);
    setDragIndex(null);
    setDropIndex(null);

    // Debounce the API call so rapid reorders don't spam the server
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      fetch("/api/tasks/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: next.map((t) => t.id) }),
      });
    }, 400);
  }

  function onDragEnd() {
    setDragIndex(null);
    setDropIndex(null);
  }

  return (
    <div className="task-card-grid">
      {tasks.map((task, i) => (
        <div
          key={task.id}
          draggable
          onDragStart={() => onDragStart(i)}
          onDragOver={(e) => onDragOver(e, i)}
          onDrop={(e) => onDrop(e, i)}
          onDragEnd={onDragEnd}
          style={{
            minWidth: 0, // prevent grid item from exceeding 1fr track
            opacity: dragIndex === i ? 0.35 : 1,
            transform: dropIndex === i && dragIndex !== i ? "scale(1.02)" : "none",
            outline: dropIndex === i && dragIndex !== i
              ? "2px solid var(--accent)"
              : "none",
            outlineOffset: 2,
            borderRadius: "var(--radius-md)",
            transition: "opacity 0.15s, transform 0.12s, outline 0.1s",
            cursor: "grab",
          }}
        >
          <TaskCard
            task={task}
            onOpen={onOpen}
            referenceDate={referenceDate}
            showClosedToday={showClosedToday}
            showClosedThisWeek={showClosedThisWeek}
          />
        </div>
      ))}
    </div>
  );
}
