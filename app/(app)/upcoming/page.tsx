import TaskList from "@/components/tasks/TaskList";

export const metadata = { title: "Upcoming — Pixie" };

export default function UpcomingPage() {
  return (
    <>
      <h1 className="page-title">Upcoming</h1>
      <p className="page-subtitle">Tasks due in the next 7 days</p>
      <TaskList
        apiUrl="/api/tasks?view=upcoming"
        emptyMessage="Nothing coming up — plan something!"
      />
    </>
  );
}
