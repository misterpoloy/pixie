import { NextRequest } from "next/server";
import { db, tasks, taskLabels, taskDayEntries, labels } from "@/lib/db";
import { resolveUserId } from "@/lib/auth-helpers";
import { createTaskSchema } from "@/lib/validators";
import { ok, err, unauthorized } from "@/lib/api-response";
import { eq, and, gte, lte, isNull, inArray, asc } from "drizzle-orm";
import { startOfDay, endOfDay, addDays } from "@/lib/date-helpers";

type TaskRow = Record<string, unknown>;

async function withLabels(rows: TaskRow[]): Promise<TaskRow[]> {
  if (!rows.length) return rows;
  const ids = rows.map((r) => r.id as string);
  const labelRows = await db
    .select({ taskId: taskLabels.taskId, labelId: taskLabels.labelId, name: labels.name, color: labels.color })
    .from(taskLabels)
    .innerJoin(labels, eq(taskLabels.labelId, labels.id))
    .where(inArray(taskLabels.taskId, ids));
  const byTask: Record<string, typeof labelRows> = {};
  for (const row of labelRows) {
    if (!byTask[row.taskId]) byTask[row.taskId] = [];
    byTask[row.taskId].push(row);
  }
  return rows.map((r) => ({ ...r, labels: byTask[r.id as string] ?? [] }));
}

export async function GET(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) return unauthorized();

  const { searchParams } = new URL(req.url);
  const view = searchParams.get("view");
  const date = searchParams.get("date"); // YYYY-MM-DD — fetch tasks for a specific date
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

  // ?date=YYYY-MM-DD — fetch tasks for a specific calendar date
  // Today: same logic as view=today. Past: use snapshot (taskDayEntries).
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const todayStr = new Date().toISOString().slice(0, 10);

    if (date === todayStr) {
      // Reuse today logic: tasks due today or overdue
      const now = new Date();
      conditions.push(lte(tasks.dueDate, endOfDay(now)));
      const parentRows = await db.select().from(tasks)
        .where(and(...conditions))
        .orderBy(asc(tasks.sortOrder), asc(tasks.createdAt));
      if (parentRows.length === 0) return ok([]);
      const parentIds = parentRows.map((r) => r.id);
      const childRows = await db.select().from(tasks)
        .where(and(eq(tasks.userId, userId), inArray(tasks.parentId, parentIds)))
        .orderBy(asc(tasks.sortOrder), asc(tasks.createdAt));
      return ok(await withLabels([...parentRows, ...childRows] as TaskRow[]));
    }

    // Past date: look up snapshot — tasks that were open that day
    const snapshotRows = await db
      .select({ taskId: taskDayEntries.taskId })
      .from(taskDayEntries)
      .where(and(eq(taskDayEntries.userId, userId), eq(taskDayEntries.date, date)));

    const snapshotIds = snapshotRows.map((r) => r.taskId);
    if (snapshotIds.length === 0) return ok([]);

    // Also include tasks completed on this date (completedAt on that day)
    const [dayStart, dayEnd] = [
      new Date(`${date}T00:00:00`),
      new Date(`${date}T23:59:59.999`),
    ];
    const completedRows = await db.select({ id: tasks.id }).from(tasks)
      .where(and(
        eq(tasks.userId, userId),
        gte(tasks.completedAt, dayStart),
        lte(tasks.completedAt, dayEnd),
        isNull(tasks.parentId),
      ));
    const completedIds = completedRows.map((r) => r.id);

    const allParentIds = [...new Set([...snapshotIds, ...completedIds])];
    const parentRows = await db.select().from(tasks)
      .where(and(eq(tasks.userId, userId), inArray(tasks.id, allParentIds)))
      .orderBy(asc(tasks.sortOrder), asc(tasks.createdAt));

    if (parentRows.length === 0) return ok([]);
    const childRows = await db.select().from(tasks)
      .where(and(eq(tasks.userId, userId), inArray(tasks.parentId, allParentIds)))
      .orderBy(asc(tasks.sortOrder), asc(tasks.createdAt));

    return ok(await withLabels([...parentRows, ...childRows] as TaskRow[]));
  }

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

    return ok(await withLabels([...parentRows, ...childRows] as TaskRow[]));
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

  return ok(await withLabels(rows as TaskRow[]));
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
