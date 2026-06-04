import { NextRequest } from "next/server";
import { db, lists, sections, tasks } from "@/lib/db";
import { resolveUserId } from "@/lib/auth-helpers";
import { updateListSchema } from "@/lib/validators";
import { ok, err, unauthorized, forbidden, notFound } from "@/lib/api-response";
import { eq, and, asc } from "drizzle-orm";

async function getList(id: string, userId: string) {
  const [list] = await db
    .select()
    .from(lists)
    .where(and(eq(lists.id, id), eq(lists.userId, userId)))
    .limit(1);
  return list;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await resolveUserId(req);
  if (!userId) return unauthorized();
  const { id } = await params;

  const list = await getList(id, userId);
  if (!list) return notFound("List");

  const [listSections, listTasks] = await Promise.all([
    db.select().from(sections).where(eq(sections.listId, id)).orderBy(asc(sections.sortOrder)),
    db.select().from(tasks).where(and(eq(tasks.listId, id), eq(tasks.userId, userId))).orderBy(asc(tasks.sortOrder)),
  ]);

  return ok({ ...list, sections: listSections, tasks: listTasks });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await resolveUserId(req);
  if (!userId) return unauthorized();
  const { id } = await params;

  const list = await getList(id, userId);
  if (!list) return notFound("List");

  const body = await req.json().catch(() => null);
  const parsed = updateListSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0].message);

  const [updated] = await db
    .update(lists)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(lists.id, id))
    .returning();

  return ok(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await resolveUserId(req);
  if (!userId) return unauthorized();
  const { id } = await params;

  const list = await getList(id, userId);
  if (!list) return notFound("List");

  await db.delete(lists).where(eq(lists.id, id));
  return ok({ deleted: true });
}
