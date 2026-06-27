import { NextRequest } from "next/server";
import { db, bitacoraEntries } from "@/lib/db";
import { resolveUserId } from "@/lib/auth-helpers";
import { ok, err, unauthorized, notFound } from "@/lib/api-response";
import { and, eq } from "drizzle-orm";

// PATCH /api/bitacora/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await resolveUserId(req);
  if (!userId) return unauthorized();
  const { id } = await params;

  const body = await req.json().catch(() => null);
  if (!body?.content?.trim()) return err("content is required");

  const [existing] = await db
    .select()
    .from(bitacoraEntries)
    .where(and(eq(bitacoraEntries.id, id), eq(bitacoraEntries.userId, userId)))
    .limit(1);
  if (!existing) return notFound("Bitacora entry");

  const [updated] = await db
    .update(bitacoraEntries)
    .set({ content: body.content.trim(), updatedAt: new Date() })
    .where(eq(bitacoraEntries.id, id))
    .returning();

  return ok(updated);
}

// DELETE /api/bitacora/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await resolveUserId(req);
  if (!userId) return unauthorized();
  const { id } = await params;

  const [existing] = await db
    .select()
    .from(bitacoraEntries)
    .where(and(eq(bitacoraEntries.id, id), eq(bitacoraEntries.userId, userId)))
    .limit(1);
  if (!existing) return notFound("Bitacora entry");

  await db.delete(bitacoraEntries).where(eq(bitacoraEntries.id, id));
  return ok({ deleted: true });
}
