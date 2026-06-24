import TaskList from "@/components/tasks/TaskList";

export const metadata = { title: "Someday — Pixie" };

export default function SomedayPage() {
  return (
    <TaskList
      apiUrl="/api/tasks?view=someday"
      title="Someday"
      subtitle="Ideas and tasks without a deadline"
      emptyMessage="Drop your big ideas here ✨"
      addDefaults={{ isSomeday: true }}
      viewToggle
      storageKey="pixie:someday:view"
    />
  );
}
