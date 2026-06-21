"use client";

import { useState } from "react";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function MiniCalendar() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();

  // Build cells: prev-month trailing days + current month + next-month leading
  const cells: { day: number; type: "prev" | "current" | "next" }[] = [];
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ day: prevDays - i, type: "prev" });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, type: "current" });
  }
  const remaining = 42 - cells.length; // always 6 rows
  for (let d = 1; d <= remaining; d++) {
    cells.push({ day: d, type: "next" });
  }

  function isToday(day: number, type: string) {
    return (
      type === "current" &&
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    );
  }

  function prev() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }
  function next() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  return (
    <div className="widget">
      <div className="widget-title">Calendar</div>

      {/* Month nav */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <button
          onClick={prev}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "2px 4px", fontSize: 13 }}
        >‹</button>
        <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)" }}>
          {MONTHS[month]} {year}
        </span>
        <button
          onClick={next}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "2px 4px", fontSize: 13 }}
        >›</button>
      </div>

      {/* Weekday headers */}
      <div className="mini-cal-grid" style={{ marginBottom: 2 }}>
        {WEEKDAYS.map((d, i) => (
          <div key={i} style={{ textAlign: "center", fontSize: "0.6rem", color: "var(--text-muted)", fontWeight: 700, padding: "2px 0" }}>
            {d}
          </div>
        ))}
      </div>

      {/* Days */}
      <div className="mini-cal-grid">
        {cells.map((cell, i) => (
          <div
            key={i}
            className={[
              "mini-cal-day",
              isToday(cell.day, cell.type) ? "today" : "",
              cell.type !== "current" ? "other-month" : "",
            ].join(" ")}
          >
            {cell.day}
          </div>
        ))}
      </div>
    </div>
  );
}
