import { NextRequest } from "next/server";
import { db, tasks, taskLabels } from "@/lib/db";
import { resolveUserId } from "@/lib/auth-helpers";
import { createTaskSchema } from "@/lib/validators";
import { ok, err, unauthorized } from "@/lib/api-response";
import { eq, and, gte, lte, isNull, asc, desc } from "drizzle-orm";
import { startOfDay, endOfDay, addDays } from "@/lib/date-helpers";

export async function GET(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) return unauthorized();

  const { searchParams } = new URL(req.url);
  const view = searchParams.get("view");
  const listId = searchParams.get("listId");
  const sectionId = searchParams.get("sectionId");
  const parentId = searchParams.get("parentId");
  const status = searchParams.get("status");

  const conditions = [eq(tasks.userId, userId)];

  if (listId) conditions.push(eq(tasks.listId, listId));
  if (sectionId) conditions.push(eq(tasks.sectionId, sectionId));
  if (parentId === "null") conditions.push(isNull(tasks.parentId));
  else if (parentId) conditions.push(eq(tasks.parentId, parentId));
  if (status) conditions.push(eq(tasks.status, status as any));

  if (view === "today") {
    const now = new Date();
    conditions.push(gte(tasks.dueDate, startOfDay(now)));
    conditions.push(lte(tasks.dueDate, endOfDay(now)));
  } else if (view === "tomorrow") {
    const tom = addDays(new Date(), 1);
    conditions.push(gte(tasks.dueDate, startOfDay(tom)));
    conditions.push(lte(tasks.dueDate, endOfDay(tom)));
  } else if (view === "upcoming") {
    const now = new Date();
    const in7 = addDays(now, 7);
    conditions.push(gte(tasks.dueDate, startOfDay(addDays(now, 1))));
    conditions.push(lte(tasks.dueDate, endOfDay(in7)));
  } else if (view === "someday") {
    conditions.push(eq(tasks.isSomeday, true));
  }

  const rows = await db
    .select()
    .from(tasks)
    .where(and(...conditions))
    .orderBy(asc(tasks.sortOrder), asc(tasks.createdAt));

  return ok(rows);
}

export async function POST(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) return unauthorized();

  const body = await req.json().catch(() => null);
  const parsed = createTaskSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0].message);

  const { labelIds, ...taskData } = parsed.data;

  const [task] = await db
    .insert(tasks)
    .values({
      ...taskData,
      userId,
      dueDate: taskData.dueDate ? new Date(taskData.dueDate) : null,
    })
    .returning();

  if (labelIds?.length) {
    await db.insert(taskLabels).values(
      labelIds.map((labelId) => ({ taskId: task.id, labelId }))
    );
  }

  return ok(task, 201);
}
