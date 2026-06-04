"use client";

import { useEffect, useState } from "react";
import TaskItem from "@/components/tasks/TaskItem";
import TaskDetailModal from "@/components/tasks/TaskDetailModal";
import { startOfDay, endOfDay } from "@/lib/date-helpers";

interface Task {
  id: string;
  title: string;
  status: "pending" | "in_progress" | "done" | "cancelled";
  priority: "none" | "low" | "medium" | "high";
  dueDate?: string | null;
  isSomeday?: boolean;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export default function CalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState<Date>(today);
  const [dayTasks, setDayTasks] = useState<Task[]>([]);
  const [monthTaskDates, setMonthTaskDates] = useState<Set<string>>(new Set());
  const [openTask, setOpenTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(false);

  // Load tasks for selected day
  useEffect(() => {
    setLoading(true);
    const start = startOfDay(selected).toISOString();
    const end = endOfDay(selected).toISOString();
    fetch(`/api/tasks?view=upcoming`)
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          const filtered = d.data.filter((t: Task) => {
            if (!t.dueDate) return false;
            const dd = new Date(t.dueDate);
            return dd >= new Date(start) && dd <= new Date(end);
          });
          setDayTasks(filtered);
        }
        setLoading(false);
      });
  }, [selected]);

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  function selectDay(day: number) {
    setSelected(new Date(year, month, day));
  }

  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  const isSelected = (day: number) =>
    day === selected.getDate() && month === selected.getMonth() && year === selected.getFullYear();

  return (
    <>
      <h1 className="page-title">Calendar</h1>

      <div className="glass-card" style={{ padding: 20, marginBottom: 24 }}>
        {/* Month nav */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={prevMonth}>‹</button>
          <span style={{ fontWeight: 600, fontSize: "1rem" }}>
            {MONTHS[month]} {year}
          </span>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={nextMonth}>›</button>
        </div>

        {/* Weekday headers */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3, marginBottom: 4 }}>
          {WEEKDAYS.map((d) => (
            <div key={d} style={{ textAlign: "center", fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600, padding: "4px 0" }}>
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="cal-grid">
          {cells.map((day, i) => (
            <div
              key={i}
              className={[
                "cal-day",
                day && isToday(day) ? "today" : "",
                day && isSelected(day) ? "selected" : "",
              ].join(" ")}
              onClick={() => day && selectDay(day)}
              style={{ color: !day ? "transparent" : undefined, cursor: day ? "pointer" : "default" }}
            >
              {day ?? ""}
            </div>
          ))}
        </div>
      </div>

      {/* Day task list */}
      <div>
        <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 12, color: "var(--text-secondary)" }}>
          {selected.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </h2>

        {loading && <p style={{ color: "var(--text-muted)" }}>Loading…</p>}

        {!loading && dayTasks.length === 0 && (
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>No tasks on this day.</p>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {dayTasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onOpen={setOpenTask}
            />
          ))}
        </div>
      </div>

      {openTask && (
        <TaskDetailModal task={openTask} onClose={() => setOpenTask(null)} />
      )}
    </>
  );
}
