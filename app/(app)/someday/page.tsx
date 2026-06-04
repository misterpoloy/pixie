import TaskList from "@/components/tasks/TaskList";

export const metadata = { title: "Someday — Pixie" };

export default function SomedayPage() {
  return (
    <>
      <h1 className="page-title">Someday</h1>
      <p className="page-subtitle">Ideas and tasks without a deadline</p>
      <TaskList
        apiUrl="/api/tasks?view=someday"
        emptyMessage="Drop your big ideas here ✨"
        addDefaults={{ isSomeday: true }}
      />
    </>
  );
}
