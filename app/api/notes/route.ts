import { NextRequest } from "next/server";
import { db, notes } from "@/lib/db";
import { resolveUserId } from "@/lib/auth-helpers";
import { createNoteSchema } from "@/lib/validators";
import { ok, err, unauthorized } from "@/lib/api-response";
import { eq, and, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) return unauthorized();

  const { searchParams } = new URL(req.url);
  const taskId = searchParams.get("taskId");
  const listId = searchParams.get("listId");

  const conditions = [eq(notes.userId, userId)];
  if (taskId) conditions.push(eq(notes.taskId, taskId));
  if (listId) conditions.push(eq(notes.listId, listId));

  const rows = await db
    .select()
    .from(notes)
    .where(and(...conditions))
    .orderBy(desc(notes.pinned), desc(notes.updatedAt));

  return ok(rows);
}

export async function POST(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) return unauthorized();

  const body = await req.json().catch(() => null);
  const parsed = createNoteSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0].message);

  const [note] = await db.insert(notes).values({ ...parsed.data, userId }).returning();
  return ok(note, 201);
}
