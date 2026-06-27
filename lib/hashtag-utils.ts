const TAG_COLORS = [
  "#7c6ef7", "#0a84ff", "#30d158", "#ffd60a",
  "#ff9f0a", "#ff453a", "#bf5af2", "#32ade6",
  "#ac8e68", "#636366",
];

export function randomTagColor(): string {
  return TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)];
}

export function parseHashtags(text: string): { cleanTitle: string; tags: string[] } {
  const seen = new Set<string>();
  const tags: string[] = [];
  const cleanTitle = text
    .replace(/#([\w-]+)/g, (_, tag) => {
      const lower = tag.toLowerCase();
      if (!seen.has(lower)) { seen.add(lower); tags.push(lower); }
      return "";
    })
    .replace(/\s+/g, " ")
    .trim();
  return { cleanTitle, tags };
}
