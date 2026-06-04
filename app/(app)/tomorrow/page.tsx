import TaskList from "@/components/tasks/TaskList";
import { addDays } from "@/lib/date-helpers";

export const metadata = { title: "Tomorrow — Pixie" };

export default function TomorrowPage() {
  const tom = addDays(new Date(), 1);
  const dateStr = tom.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <>
      <h1 className="page-title">Tomorrow</h1>
      <p className="page-subtitle">{dateStr}</p>
      <TaskList
        apiUrl="/api/tasks?view=tomorrow"
        emptyMessage="Nothing planned for tomorrow yet."
        addDefaults={{ dueDate: addDays(new Date(), 1).toISOString() }}
      />
    </>
  );
}
