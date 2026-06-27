// Extensible subtask highlight system.
// Add new resolvers to HIGHLIGHT_RESOLVERS to apply color accents based on any condition.
// Each resolver receives a subtask and a reference date (YYYY-MM-DD) and returns a highlight or null.
// referenceDate defaults to today's local date — pass the calendar-selected date to shift accents.

export interface SubtaskHighlight {
  textColor: string;
  badgeColor: string;
  badgeBg: string;
  badgeBorder: string;
  rowBg: string;
  checkBorderColor: string;
  badgeLabel?: string;
}

interface SubtaskLike {
  createdAt?: string;
  completedAt?: string | null;
  status: string;
}

type HighlightResolver = (sub: SubtaskLike, ref: string) => SubtaskHighlight | null;

// Convert a Date (or ISO string) to local YYYY-MM-DD
function toLocalDateStr(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

// Today's local date — used as default referenceDate
export function todayLocalStr(): string {
  return toLocalDateStr(new Date());
}

// Resolver: created on referenceDate → accent blue
const createdOnDateHighlight: HighlightResolver = (sub, ref) => {
  if (!sub.createdAt) return null;
  if (toLocalDateStr(sub.createdAt) !== ref) return null;
  return {
    textColor: "var(--accent-hover)",
    badgeColor: "var(--accent)",
    badgeBg: "rgba(124,110,247,0.14)",
    badgeBorder: "rgba(124,110,247,0.35)",
    rowBg: "rgba(124,110,247,0.07)",
    checkBorderColor: "var(--accent)",
    badgeLabel: "new",
  };
};

// Resolver: completed on referenceDate → accent blue with strikethrough treatment
const completedOnDateHighlight: HighlightResolver = (sub, ref) => {
  if (sub.status !== "done") return null;
  if (!sub.completedAt) return null;
  if (toLocalDateStr(sub.completedAt) !== ref) return null;
  return {
    textColor: "var(--accent-hover)",
    badgeColor: "var(--accent)",
    badgeBg: "rgba(124,110,247,0.10)",
    badgeBorder: "rgba(124,110,247,0.25)",
    rowBg: "rgba(124,110,247,0.05)",
    checkBorderColor: "var(--accent)",
    badgeLabel: "done",
  };
};

// Registry — push new resolvers here as filters are introduced
export const HIGHLIGHT_RESOLVERS: HighlightResolver[] = [
  createdOnDateHighlight,
  completedOnDateHighlight,
];

// Pass referenceDate (YYYY-MM-DD) to evaluate against a specific date.
// Omit or pass undefined to use today (backwards-compatible default).
export function resolveHighlight(sub: SubtaskLike, referenceDate?: string): SubtaskHighlight | null {
  const ref = referenceDate ?? todayLocalStr();
  for (const resolve of HIGHLIGHT_RESOLVERS) {
    const h = resolve(sub, ref);
    if (h) return h;
  }
  return null;
}
