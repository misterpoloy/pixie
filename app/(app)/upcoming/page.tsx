import TaskList from "@/components/tasks/TaskList";

export const metadata = { title: "Upcoming — Pixie" };

export default function UpcomingPage() {
  return (
    <TaskList
      apiUrl="/api/tasks?view=upcoming"
      title="Upcoming"
      subtitle="Tasks on your near-term horizon"
      emptyMessage="Nothing in your horizon yet."
      addDefaults={{ isUpcoming: true }}
      metaMode="upcoming"
      viewToggle
      storageKey="pixie:upcoming:view"
    />
  );
}
