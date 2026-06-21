"use client";

// World clock widget.
// Time data source: browser Intl.DateTimeFormat API — the standard IANA
// timezone database built into every modern browser. Always accurate, no
// external API key, works offline, handles DST automatically.

import { useEffect, useState } from "react";

interface City {
  id: string;
  label: string;
  flag: string;
  tz: string;
}

const CITIES: City[] = [
  { id: "guatemala",     label: "Guatemala",      flag: "🇬🇹", tz: "America/Guatemala"   },
  { id: "mexico-city",   label: "México",          flag: "🇲🇽", tz: "America/Mexico_City" },
  { id: "monterrey",     label: "Monterrey",       flag: "🇲🇽", tz: "America/Monterrey"   },
  { id: "san-francisco", label: "San Francisco",   flag: "🇺🇸", tz: "America/Los_Angeles" },
  { id: "new-york",      label: "New York",        flag: "🇺🇸", tz: "America/New_York"    },
  { id: "oslo",          label: "Oslo",            flag: "🇳🇴", tz: "Europe/Oslo"         },
  { id: "chennai",       label: "Chennai",         flag: "🇮🇳", tz: "Asia/Kolkata"        },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatTime(tz?: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date());
}

// Computes offset of targetTz relative to the user's local timezone.
// Returns a string like "+8h", "-2h", "+5h 30m", "±0".
// Handles half-hour and quarter-hour offsets (India, Nepal, etc.)
function relativeOffset(targetTz: string): string {
  const now = new Date();

  const toMinutes = (tz?: string) => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(now);
    const h = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0");
    const m = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0");
    return h * 60 + m;
  };

  let diff = toMinutes(targetTz) - toMinutes(undefined);

  // Normalise across midnight boundaries
  if (diff > 720)  diff -= 1440;
  if (diff < -720) diff += 1440;

  if (diff === 0) return "±0";

  const sign   = diff > 0 ? "+" : "-";
  const abs    = Math.abs(diff);
  const hours  = Math.floor(abs / 60);
  const mins   = abs % 60;

  return mins > 0
    ? `${sign}${hours}h ${mins}m`
    : `${sign}${hours}h`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function WorldClock() {
  const [tick, setTick] = useState(0);

  // Re-render every 30 s so times stay fresh
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  // Local timezone name (e.g. "CST", "EST")
  const localTzLabel = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <div className="widget">
      <div className="widget-title">World Clock</div>

      {/* Reference — your local time */}
      <div className="clock-reference">
        <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginBottom: 2 }}>
          📍 Your time · {localTzLabel}
        </div>
        <div style={{ fontSize: "1.3rem", fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text-primary)", lineHeight: 1 }}>
          {formatTime()}
        </div>
      </div>

      {/* City list */}
      <div>
        {CITIES.map((city) => {
          const offset = relativeOffset(city.tz);
          const isAhead = offset.startsWith("+");
          const isBehind = offset.startsWith("-");

          return (
            <div key={city.id} className="clock-city-row">
              {/* Flag */}
              <span style={{ fontSize: 16, flexShrink: 0, lineHeight: 1 }}>{city.flag}</span>

              {/* Name + time */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {city.label}
                </div>
                <div style={{ fontSize: "0.82rem", fontWeight: 500, color: "var(--text-secondary)", lineHeight: 1.3 }}>
                  {formatTime(city.tz)}
                </div>
              </div>

              {/* Relative offset badge */}
              <span
                className="clock-offset-badge"
                style={{
                  color: isAhead
                    ? "var(--success)"
                    : isBehind
                      ? "var(--warning)"
                      : "var(--text-muted)",
                  borderColor: isAhead
                    ? "rgba(48,209,88,0.25)"
                    : isBehind
                      ? "rgba(255,214,10,0.25)"
                      : "var(--glass-border)",
                  background: isAhead
                    ? "rgba(48,209,88,0.08)"
                    : isBehind
                      ? "rgba(255,214,10,0.08)"
                      : "rgba(255,255,255,0.04)",
                }}
              >
                {offset}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
