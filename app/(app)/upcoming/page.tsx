import TaskList from "@/components/tasks/TaskList";

export const metadata = { title: "Upcoming — Pixie" };

export default function UpcomingPage() {
  return (
    <>
      <h1 className="page-title">Upcoming</h1>
      <p className="page-subtitle">Tasks on your near-term horizon</p>
      <TaskList
        apiUrl="/api/tasks?view=upcoming"
        emptyMessage="Nothing in your horizon yet."
        addDefaults={{ isUpcoming: true }}
        metaMode="upcoming"
      />
    </>
  );
}
