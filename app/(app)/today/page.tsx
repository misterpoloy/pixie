import TodayView from "./TodayView";

export const metadata = { title: "Today — Pixie" };

export default function TodayPage() {
  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  // YYYY-MM-DD in local time for API calls and Bitacora
  const localDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  return <TodayView dateStr={dateStr} localDate={localDate} />;
}
