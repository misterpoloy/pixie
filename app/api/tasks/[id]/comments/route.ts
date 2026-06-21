import { NextRequest } from "next/server";
import { db, tasks, taskComments } from "@/lib/db";
import { resolveUserId } from "@/lib/auth-helpers";
import { ok, err, unauthorized } from "@/lib/api-response";
import { eq, and, asc } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await resolveUserId(req);
  if (!userId) return unauthorized();

  const { id } = await params;

  // Verify task belongs to user
  const [task] = await db.select({ id: tasks.id }).from(tasks).where(
    and(eq(tasks.id, id), eq(tasks.userId, userId))
  );
  if (!task) return err("Not found", 404);

  const comments = await db
    .select()
    .from(taskComments)
    .where(eq(taskComments.taskId, id))
    .orderBy(asc(taskComments.createdAt));

  return ok(comments);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await resolveUserId(req);
  if (!userId) return unauthorized();

  const { id } = await params;

  const [task] = await db.select({ id: tasks.id, userId: tasks.userId }).from(tasks).where(
    and(eq(tasks.id, id), eq(tasks.userId, userId))
  );
  if (!task) return err("Not found", 404);

  const body = await req.json().catch(() => null);
  const content = body?.content?.trim();
  const authorName = body?.authorName?.trim() || "You";

  if (!content) return err("content is required");

  const [comment] = await db
    .insert(taskComments)
    .values({ taskId: id, userId, authorName, content })
    .returning();

  return ok(comment, 201);
}
