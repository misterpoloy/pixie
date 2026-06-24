"use client";

import { useEffect, useState } from "react";

interface City {
  id: string;
  city: string;
  country: string;
  tz: string;
}

const CITIES: City[] = [
  { id: "guatemala",     city: "Guatemala City", country: "GT", tz: "America/Guatemala"   },
  { id: "mexico-city",   city: "Mexico City",    country: "MX", tz: "America/Mexico_City" },
  { id: "monterrey",     city: "Monterrey",      country: "MX", tz: "America/Monterrey"   },
  { id: "san-francisco", city: "San Francisco",  country: "US", tz: "America/Los_Angeles" },
  { id: "new-york",      city: "New York",       country: "US", tz: "America/New_York"    },
  { id: "oslo",          city: "Oslo",           country: "NO", tz: "Europe/Oslo"         },
  { id: "chennai",       city: "Chennai",        country: "IN", tz: "Asia/Kolkata"        },
];

function formatTime(tz?: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date());
}

function formatTimeParts(tz?: string): { time: string; period: string } {
  const raw = formatTime(tz);
  const spaceIdx = raw.lastIndexOf(" ");
  return {
    time: raw.slice(0, spaceIdx),
    period: raw.slice(spaceIdx + 1),
  };
}

function relativeOffset(targetTz: string): { label: string; sign: "ahead" | "behind" | "same" } {
  const now = new Date();
  const toMinutes = (tz?: string) => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false,
    }).formatToParts(now);
    const h = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0");
    const m = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0");
    return h * 60 + m;
  };

  let diff = toMinutes(targetTz) - toMinutes(undefined);
  if (diff > 720)  diff -= 1440;
  if (diff < -720) diff += 1440;
  if (diff === 0) return { label: "±0", sign: "same" };

  const sign  = diff > 0 ? "+" : "-";
  const abs   = Math.abs(diff);
  const hours = Math.floor(abs / 60);
  const mins  = abs % 60;
  const label = mins > 0 ? `${sign}${hours}h ${mins}m` : `${sign}${hours}h`;
  return { label, sign: diff > 0 ? "ahead" : "behind" };
}

export default function WorldClock() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const localTzLabel = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const local = formatTimeParts();

  return (
    <div className="widget">
      <div className="widget-title">World Clock</div>

      {/* Local reference card */}
      <div className="clock-reference">
        <div className="clock-reference-label">{localTzLabel}</div>
        <div className="clock-reference-time">
          <span className="clock-ref-digits">{local.time}</span>
          <span className="clock-ref-period">{local.period}</span>
        </div>
      </div>

      {/* Table */}
      <div className="clock-table-wrap">
        <table className="clock-table">
          <thead>
            <tr>
              <th>City</th>
              <th>CC</th>
              <th>Time</th>
              <th>Δ</th>
            </tr>
          </thead>
          <tbody>
            {CITIES.map((c) => {
              const { label, sign } = relativeOffset(c.tz);
              const { time, period } = formatTimeParts(c.tz);
              return (
                <tr key={c.id} className="clock-row">
                  <td className="clock-cell-city">{c.city}</td>
                  <td className="clock-cell-cc">{c.country}</td>
                  <td className="clock-cell-time">
                    <span className="clock-digits">{time}</span>
                    <span className="clock-period">{period}</span>
                  </td>
                  <td className="clock-cell-offset">
                    <span className={`clock-badge clock-badge--${sign}`}>{label}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
