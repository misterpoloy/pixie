import TodayView from "./TodayView";

export const metadata = { title: "Today — Pixie" };

export default function TodayPage() {
  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return <TodayView dateStr={dateStr} />;
}
