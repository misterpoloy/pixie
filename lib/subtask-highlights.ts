// Extensible subtask highlight system.
// Add new resolvers to HIGHLIGHT_RESOLVERS to apply color accents based on any condition.
// Each resolver receives a subtask and returns a highlight config or null.

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

type HighlightResolver = (sub: SubtaskLike) => SubtaskHighlight | null;

const localDateStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// Resolver: created today → accent blue
const createdTodayHighlight: HighlightResolver = (sub) => {
  if (!sub.createdAt) return null;
  const created = new Date(sub.createdAt);
  const createdLocal = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, "0")}-${String(created.getDate()).padStart(2, "0")}`;
  if (createdLocal !== localDateStr()) return null;
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

// Resolver: completed today → accent blue (dimmed, shown with strikethrough)
const completedTodayHighlight: HighlightResolver = (sub) => {
  if (sub.status !== "done") return null;
  if (!sub.completedAt) return null;
  const completed = new Date(sub.completedAt);
  const completedLocal = `${completed.getFullYear()}-${String(completed.getMonth() + 1).padStart(2, "0")}-${String(completed.getDate()).padStart(2, "0")}`;
  if (completedLocal !== localDateStr()) return null;
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
  createdTodayHighlight,
  completedTodayHighlight,
];

export function resolveHighlight(sub: SubtaskLike): SubtaskHighlight | null {
  // Allow done items through — completedTodayHighlight handles them
  for (const resolve of HIGHLIGHT_RESOLVERS) {
    const h = resolve(sub);
    if (h) return h;
  }
  return null;
}
