"use client";

import { useEffect, useState, useCallback } from "react";
import TaskItem from "@/components/tasks/TaskItem";
import TaskDetailModal from "@/components/tasks/TaskDetailModal";

interface Task {
  id: string;
  title: string;
  status: "pending" | "in_progress" | "done" | "cancelled";
  snapshotStatus?: "pending" | "in_progress" | "done" | "cancelled";
  priority: "none" | "low" | "medium" | "high";
  dueDate?: string | null;
  coverImage?: string | null;
  notes?: string | null;
  isSomeday?: boolean;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function toLocalDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function monthRange(year: number, month: number): { start: string; end: string } {
  const start = toLocalDate(year, month, 1);
  const lastDay = new Date(year, month + 1, 0).getDate();
  const end = toLocalDate(year, month, lastDay);
  return { start, end };
}

export default function CalendarPage() {
  const today = new Date();
  const todayStr = toLocalDate(today.getFullYear(), today.getMonth(), today.getDate());

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState<string>(todayStr);
  const [dayTasks, setDayTasks] = useState<Task[]>([]);
  // Map of YYYY-MM-DD → count of open tasks that day
  const [dayCounts, setDayCounts] = useState<Map<string, number>>(new Map());
  const [openTask, setOpenTask] = useState<Task | null>(null);
  const [loadingDay, setLoadingDay] = useState(false);

  // Load month counts whenever month/year changes
  const loadMonthCounts = useCallback(async () => {
    const { start, end } = monthRange(year, month);
    const res = await fetch(`/api/calendar?start=${start}&end=${end}`);
    const d = await res.json();
    if (d.ok) {
      const map = new Map<string, number>();
      for (const row of d.data) map.set(row.date, row.count);
      setDayCounts(map);
    }
  }, [year, month]);

  useEffect(() => { loadMonthCounts(); }, [loadMonthCounts]);

  // Load tasks for selected day from carry-forward snapshots
  const loadDayTasks = useCallback(async (date: string) => {
    setLoadingDay(true);
    const res = await fetch(`/api/calendar/day?date=${date}`);
    const d = await res.json();
    if (d.ok) setDayTasks(d.data);
    else setDayTasks([]);
    setLoadingDay(false);
  }, []);

  useEffect(() => { loadDayTasks(selected); }, [selected, loadDayTasks]);

  // Calendar grid
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  function selectDay(day: number) {
    setSelected(toLocalDate(year, month, day));
  }

  const isToday = (day: number) => toLocalDate(year, month, day) === todayStr;
  const isSelected = (day: number) => toLocalDate(year, month, day) === selected;

  const selectedLabel = new Date(selected + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  const openCount = dayCounts.get(selected) ?? 0;

  return (
    <>
      <h1 className="page-title">Calendar</h1>

      <div className="glass-card" style={{ padding: 20, marginBottom: 24 }}>
        {/* Month nav */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={prevMonth}>‹</button>
          <span style={{ fontWeight: 600, fontSize: "1rem" }}>{MONTHS[month]} {year}</span>
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
          {cells.map((day, i) => {
            const dateStr = day ? toLocalDate(year, month, day) : "";
            const count = day ? (dayCounts.get(dateStr) ?? 0) : 0;

            return (
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
                {count > 0 && (
                  <span className="cal-day-badge">{count}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Day detail */}
      <div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12 }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-secondary)", margin: 0 }}>
            {selectedLabel}
          </h2>
          {openCount > 0 && (
            <span style={{
              fontSize: "0.75rem", fontWeight: 600,
              color: "var(--warning)",
              background: "rgba(255,214,10,0.12)",
              border: "1px solid rgba(255,214,10,0.25)",
              borderRadius: "var(--radius-full)",
              padding: "2px 9px",
            }}>
              {openCount} open{openCount !== 1 ? "" : ""}
            </span>
          )}
        </div>

        {loadingDay && <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Loading…</p>}

        {!loadingDay && dayTasks.length === 0 && (
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
            No carry-forward data for this day.{" "}
            {selected >= todayStr ? "Visit Today to start tracking." : ""}
          </p>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {dayTasks.map((task) => (
            <div key={task.id} style={{ position: "relative" }}>
              <TaskItem task={task} onOpen={setOpenTask} />
              {/* Show if the task was still open at snapshot time vs completed */}
              {task.snapshotStatus && task.snapshotStatus !== task.status && (
                <span style={{
                  position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                  fontSize: "0.68rem", color: "var(--text-muted)", fontStyle: "italic",
                }}>
                  was {task.snapshotStatus}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {openTask && (
        <TaskDetailModal task={openTask} onClose={() => setOpenTask(null)} />
      )}
    </>
  );
}
