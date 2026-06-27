"use client";

import { useState } from "react";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

interface Props {
  selectedDate?: string;   // YYYY-MM-DD
  onSelect?: (date: string) => void;
}

function toYMD(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function MiniCalendar({ selectedDate, onSelect }: Props) {
  const today = new Date();
  const todayStr = toYMD(today.getFullYear(), today.getMonth(), today.getDate());

  const initYear  = selectedDate ? parseInt(selectedDate.slice(0, 4))  : today.getFullYear();
  const initMonth = selectedDate ? parseInt(selectedDate.slice(5, 7)) - 1 : today.getMonth();

  const [year, setYear]   = useState(initYear);
  const [month, setMonth] = useState(initMonth);

  // Keep view in sync if selectedDate changes from outside (e.g. "today" click)
  // We only jump the view when month/year change — day clicks are already handled
  const selYear  = selectedDate ? parseInt(selectedDate.slice(0, 4))  : null;
  const selMonth = selectedDate ? parseInt(selectedDate.slice(5, 7)) - 1 : null;
  if (selYear !== null && selMonth !== null && (selYear !== year || selMonth !== month)) {
    setYear(selYear);
    setMonth(selMonth);
  }

  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevDays    = new Date(year, month, 0).getDate();

  const cells: { day: number; type: "prev" | "current" | "next" }[] = [];
  for (let i = firstDay - 1; i >= 0; i--) cells.push({ day: prevDays - i, type: "prev" });
  for (let d = 1; d <= daysInMonth; d++)   cells.push({ day: d, type: "current" });
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++)     cells.push({ day: d, type: "next" });

  function cellDate(cell: { day: number; type: string }): string | null {
    if (cell.type === "current") return toYMD(year, month, cell.day);
    if (cell.type === "prev") {
      const m = month === 0 ? 11 : month - 1;
      const y = month === 0 ? year - 1 : year;
      return toYMD(y, m, cell.day);
    }
    // next
    const m = month === 11 ? 0 : month + 1;
    const y = month === 11 ? year + 1 : year;
    return toYMD(y, m, cell.day);
  }

  function prev() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }
  function next() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  function handleClick(cell: { day: number; type: string }) {
    if (!onSelect) return;
    const d = cellDate(cell);
    if (d) onSelect(d);
  }

  return (
    <div className="widget">
      <div className="widget-title">Calendar</div>

      {/* Month nav */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <button onClick={prev} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "2px 4px", fontSize: 13 }}>‹</button>
        <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)" }}>
          {MONTHS[month]} {year}
        </span>
        <button onClick={next} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "2px 4px", fontSize: 13 }}>›</button>
      </div>

      {/* Weekday headers */}
      <div className="mini-cal-grid" style={{ marginBottom: 2 }}>
        {WEEKDAYS.map((d, i) => (
          <div key={i} style={{ textAlign: "center", fontSize: "0.6rem", color: "var(--text-muted)", fontWeight: 700, padding: "2px 0" }}>{d}</div>
        ))}
      </div>

      {/* Days */}
      <div className="mini-cal-grid">
        {cells.map((cell, i) => {
          const dateStr = cellDate(cell);
          const isToday    = dateStr === todayStr;
          const isSelected = dateStr === selectedDate && dateStr !== todayStr;
          const isOther    = cell.type !== "current";

          return (
            <div
              key={i}
              onClick={() => handleClick(cell)}
              className={[
                "mini-cal-day",
                isToday    ? "today"       : "",
                isSelected ? "selected"    : "",
                isOther    ? "other-month" : "",
                onSelect   ? "clickable"   : "",
              ].join(" ").trim()}
              title={dateStr ?? undefined}
            >
              {cell.day}
            </div>
          );
        })}
      </div>
    </div>
  );
}
