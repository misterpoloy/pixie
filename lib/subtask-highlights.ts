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

// Registry — push new resolvers here as filters are introduced
export const HIGHLIGHT_RESOLVERS: HighlightResolver[] = [
  createdTodayHighlight,
];

export function resolveHighlight(sub: SubtaskLike): SubtaskHighlight | null {
  if (sub.status === "done" || sub.status === "cancelled") return null;
  for (const resolve of HIGHLIGHT_RESOLVERS) {
    const h = resolve(sub);
    if (h) return h;
  }
  return null;
}
