import { NextRequest } from "next/server";
import { db, tasks, taskLabels, labels } from "@/lib/db";
import { resolveUserId } from "@/lib/auth-helpers";
import { updateTaskSchema } from "@/lib/validators";
import { ok, err, unauthorized, notFound } from "@/lib/api-response";
import { eq, and, inArray, asc } from "drizzle-orm";

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

  const subtaskRows = await db.select().from(tasks)
    .where(and(eq(tasks.parentId, id), eq(tasks.userId, userId)))
    .orderBy(asc(tasks.sortOrder), asc(tasks.createdAt));

  const subtaskIds = subtaskRows.map((s) => s.id);

  const [taskLabelRows, subtaskLabelRows] = await Promise.all([
    db.select({ taskId: taskLabels.taskId, labelId: taskLabels.labelId, name: labels.name, color: labels.color })
      .from(taskLabels)
      .innerJoin(labels, eq(taskLabels.labelId, labels.id))
      .where(eq(taskLabels.taskId, id)),
    subtaskIds.length
      ? db.select({ taskId: taskLabels.taskId, labelId: taskLabels.labelId, name: labels.name, color: labels.color })
          .from(taskLabels)
          .innerJoin(labels, eq(taskLabels.labelId, labels.id))
          .where(inArray(taskLabels.taskId, subtaskIds))
      : Promise.resolve([]),
  ]);

  // Group subtask labels by taskId
  const labelsBySubtask: Record<string, typeof subtaskLabelRows> = {};
  for (const row of subtaskLabelRows) {
    if (!labelsBySubtask[row.taskId]) labelsBySubtask[row.taskId] = [];
    labelsBySubtask[row.taskId].push(row);
  }

  const subtasks = subtaskRows.map((s) => ({ ...s, labels: labelsBySubtask[s.id] ?? [] }));

  return ok({ ...task, subtasks, labels: taskLabelRows });
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

  const { labelIds, dueDate, completedAt, isSomeday, isUpcoming, ...rest } = parsed.data;

  // Capture who made this change — prefer X-Agent-Name header (set by MCP/API agents), fall back to user name
  const agentName = req.headers.get("x-agent-name");
  const updatedBy = agentName ?? null;

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

  const normalizedFlags =
    isSomeday === undefined && isUpcoming === undefined
      ? {}
      : isSomeday
        ? { isSomeday: true, isUpcoming: false }
        : isUpcoming
          ? { isSomeday: false, isUpcoming: true }
          : {
              ...(isSomeday !== undefined && { isSomeday: false }),
              ...(isUpcoming !== undefined && { isUpcoming: false }),
            };

  const [updated] = await db
    .update(tasks)
    .set({
      ...rest,
      ...normalizedFlags,
      ...(resolvedDueDate !== undefined && { dueDate: resolvedDueDate }),
      ...(resolvedCompletedAt !== undefined && { completedAt: resolvedCompletedAt }),
      updatedAt: new Date(),
      ...(updatedBy !== null && { updatedBy }),
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
