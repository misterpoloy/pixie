import { NextRequest } from "next/server";
import { db, tasks, taskLabels, notes } from "@/lib/db";
import { resolveUserId } from "@/lib/auth-helpers";
import { searchSchema } from "@/lib/validators";
import { ok, err, unauthorized } from "@/lib/api-response";
import { eq, and, ilike, inArray, or } from "drizzle-orm";
import { startOfDay, endOfDay, addDays } from "@/lib/date-helpers";
import { gte, lte } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) return unauthorized();

  const { searchParams } = new URL(req.url);
  const parsed = searchSchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) return err(parsed.error.issues[0].message);

  const { q, labelIds, status, listId, view, page, limit } = parsed.data;
  const offset = (page - 1) * limit;

  const conditions = [
    eq(tasks.userId, userId),
    ilike(tasks.title, `%${q}%`),
  ];

  if (status) conditions.push(eq(tasks.status, status));
  if (listId) conditions.push(eq(tasks.listId, listId));

  if (view === "today") {
    const now = new Date();
    conditions.push(gte(tasks.dueDate, startOfDay(now)), lte(tasks.dueDate, endOfDay(now)));
  } else if (view === "tomorrow") {
    const tom = addDays(new Date(), 1);
    conditions.push(gte(tasks.dueDate, startOfDay(tom)), lte(tasks.dueDate, endOfDay(tom)));
  } else if (view === "upcoming") {
    conditions.push(eq(tasks.isUpcoming, true));
  } else if (view === "someday") {
    conditions.push(eq(tasks.isSomeday, true));
  }

  let taskRows = await db.select().from(tasks).where(and(...conditions)).limit(limit).offset(offset);

  // Filter by labels if specified (post-filter, avoids complex join for now)
  if (labelIds?.length) {
    const labeledTaskIds = await db
      .selectDistinct({ taskId: taskLabels.taskId })
      .from(taskLabels)
      .where(inArray(taskLabels.labelId, labelIds));
    const ids = new Set(labeledTaskIds.map((r) => r.taskId));
    taskRows = taskRows.filter((t) => ids.has(t.id));
  }

  const noteRows = await db
    .select()
    .from(notes)
    .where(and(eq(notes.userId, userId), ilike(notes.content, `%${q}%`)))
    .limit(5);

  return ok({ tasks: taskRows, notes: noteRows, page, limit });
}
