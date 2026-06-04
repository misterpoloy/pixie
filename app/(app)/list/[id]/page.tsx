import { db, lists, sections } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { eq, and, asc } from "drizzle-orm";
import ListViewClient from "./ListViewClient";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ListPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");

  const { id } = await params;

  if (id === "new") {
    return <NewListForm />;
  }

  const [list] = await db
    .select()
    .from(lists)
    .where(and(eq(lists.id, id), eq(lists.userId, session.user.id)))
    .limit(1);

  if (!list) notFound();

  const listSections = await db
    .select()
    .from(sections)
    .where(eq(sections.listId, id))
    .orderBy(asc(sections.sortOrder));

  return <ListViewClient list={list} sections={listSections} />;
}

function NewListForm() {
  return (
    <div>
      <h1 className="page-title">New List</h1>
      <p className="page-subtitle">Create a new list to organize your tasks</p>
      {/* Client form handled separately */}
    </div>
  );
}
