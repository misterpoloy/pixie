import TaskList from "@/components/tasks/TaskList";

export const metadata = { title: "Today — Pixie" };

export default function TodayPage() {
  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <>
      <h1 className="page-title">Today</h1>
      <p className="page-subtitle">{dateStr}</p>
      <TaskList
        apiUrl="/api/tasks?view=today"
        emptyMessage="Nothing due today — enjoy your day ✨"
        addDefaults={{ dueDate: new Date().toISOString() }}
      />
    </>
  );
}
