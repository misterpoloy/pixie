import { NextRequest } from "next/server";
import { db, tasks, taskLabels } from "@/lib/db";
import { resolveUserId } from "@/lib/auth-helpers";
import { createTaskSchema } from "@/lib/validators";
import { ok, err, unauthorized } from "@/lib/api-response";
import { eq, and, gte, lte, isNull, inArray, asc } from "drizzle-orm";
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
    // Show tasks due today OR overdue (carry-forward): dueDate <= end of today, not yet done/cancelled
    conditions.push(lte(tasks.dueDate, endOfDay(now)));

    const parentRows = await db
      .select()
      .from(tasks)
      .where(and(...conditions))
      .orderBy(asc(tasks.sortOrder), asc(tasks.createdAt));

    if (parentRows.length === 0) return ok([]);

    const parentIds = parentRows.map((r) => r.id);
    const childRows = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.userId, userId), inArray(tasks.parentId, parentIds)))
      .orderBy(asc(tasks.sortOrder), asc(tasks.createdAt));

    return ok([...parentRows, ...childRows]);
  } else if (view === "tomorrow") {
    const tom = addDays(new Date(), 1);
    conditions.push(gte(tasks.dueDate, startOfDay(tom)));
    conditions.push(lte(tasks.dueDate, endOfDay(tom)));
  } else if (view === "upcoming") {
    conditions.push(eq(tasks.isUpcoming, true));
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
  const normalizedFlags = taskData.isSomeday
    ? { isSomeday: true, isUpcoming: false }
    : taskData.isUpcoming
      ? { isSomeday: false, isUpcoming: true }
      : {};

  const [task] = await db
    .insert(tasks)
    .values({
      ...taskData,
      ...normalizedFlags,
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
