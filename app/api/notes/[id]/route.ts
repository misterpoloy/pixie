import { NextRequest } from "next/server";
import { db, notes } from "@/lib/db";
import { resolveUserId } from "@/lib/auth-helpers";
import { updateNoteSchema } from "@/lib/validators";
import { ok, err, unauthorized, notFound } from "@/lib/api-response";
import { eq, and } from "drizzle-orm";

async function getNote(id: string, userId: string) {
  const [note] = await db.select().from(notes).where(and(eq(notes.id, id), eq(notes.userId, userId))).limit(1);
  return note;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await resolveUserId(req);
  if (!userId) return unauthorized();
  const { id } = await params;

  const note = await getNote(id, userId);
  if (!note) return notFound("Note");

  const body = await req.json().catch(() => null);
  const parsed = updateNoteSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0].message);

  const [updated] = await db
    .update(notes)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(notes.id, id))
    .returning();

  return ok(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await resolveUserId(req);
  if (!userId) return unauthorized();
  const { id } = await params;

  const note = await getNote(id, userId);
  if (!note) return notFound("Note");

  await db.delete(notes).where(eq(notes.id, id));
  return ok({ deleted: true });
}
