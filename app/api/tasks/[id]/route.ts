import { NextRequest } from "next/server";
import { db, tasks, taskLabels } from "@/lib/db";
import { resolveUserId } from "@/lib/auth-helpers";
import { updateTaskSchema } from "@/lib/validators";
import { ok, err, unauthorized, notFound } from "@/lib/api-response";
import { eq, and, inArray } from "drizzle-orm";

async function getTask(id: string, userId: string) {
  const [task] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
    .limit(1);
  return task;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await resolveUserId(req);
  if (!userId) return unauthorized();
  const { id } = await params;

  const task = await getTask(id, userId);
  if (!task) return notFound("Task");

  const [subtasks, labels] = await Promise.all([
    db.select().from(tasks).where(and(eq(tasks.parentId, id), eq(tasks.userId, userId))),
    db.select().from(taskLabels).where(eq(taskLabels.taskId, id)),
  ]);

  return ok({ ...task, subtasks, labels });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await resolveUserId(req);
  if (!userId) return unauthorized();
  const { id } = await params;

  const task = await getTask(id, userId);
  if (!task) return notFound("Task");

  const body = await req.json().catch(() => null);
  const parsed = updateTaskSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0].message);

  const { labelIds, dueDate, completedAt, ...rest } = parsed.data;

  let resolvedCompletedAt: Date | null | undefined;
  if (rest.status === "done" && !task.completedAt) {
    resolvedCompletedAt = new Date();
  } else if (rest.status && rest.status !== "done") {
    resolvedCompletedAt = null;
  } else if (completedAt !== undefined) {
    resolvedCompletedAt = completedAt ? new Date(completedAt) : null;
  }

  const resolvedDueDate: Date | null | undefined =
    dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : undefined;

  const [updated] = await db
    .update(tasks)
    .set({
      ...rest,
      ...(resolvedDueDate !== undefined && { dueDate: resolvedDueDate }),
      ...(resolvedCompletedAt !== undefined && { completedAt: resolvedCompletedAt }),
      updatedAt: new Date(),
    })
    .where(eq(tasks.id, id))
    .returning();

  if (labelIds !== undefined) {
    await db.delete(taskLabels).where(eq(taskLabels.taskId, id));
    if (labelIds.length) {
      await db.insert(taskLabels).values(labelIds.map((labelId) => ({ taskId: id, labelId })));
    }
  }

  return ok(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await resolveUserId(req);
  if (!userId) return unauthorized();
  const { id } = await params;

  const task = await getTask(id, userId);
  if (!task) return notFound("Task");

  await db.delete(tasks).where(eq(tasks.id, id));
  return ok({ deleted: true });
}
