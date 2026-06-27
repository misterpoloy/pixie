import { NextRequest } from "next/server";
import { db, bitacoraEntries, lists } from "@/lib/db";
import { resolveUserId } from "@/lib/auth-helpers";
import { ok, err, unauthorized } from "@/lib/api-response";
import { and, eq, asc, desc } from "drizzle-orm";

// GET /api/bitacora?date=YYYY-MM-DD[&listId=uuid]
export async function GET(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) return unauthorized();

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const listId = searchParams.get("listId");

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return err("date param required (YYYY-MM-DD)");
  }

  const conditions = [
    eq(bitacoraEntries.userId, userId),
    eq(bitacoraEntries.entryDate, date),
  ];
  if (listId) conditions.push(eq(bitacoraEntries.listId, listId));

  const rows = await db
    .select({
      id: bitacoraEntries.id,
      content: bitacoraEntries.content,
      entryDate: bitacoraEntries.entryDate,
      source: bitacoraEntries.source,
      authorName: bitacoraEntries.authorName,
      listId: bitacoraEntries.listId,
      taskId: bitacoraEntries.taskId,
      isPastDated: bitacoraEntries.isPastDated,
      metadata: bitacoraEntries.metadata,
      createdAt: bitacoraEntries.createdAt,
      updatedAt: bitacoraEntries.updatedAt,
      listName: lists.name,
      listColor: lists.color,
    })
    .from(bitacoraEntries)
    .leftJoin(lists, eq(bitacoraEntries.listId, lists.id))
    .where(and(...conditions))
    .orderBy(asc(bitacoraEntries.createdAt));

  return ok(rows);
}

// POST /api/bitacora
export async function POST(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) return unauthorized();

  const body = await req.json().catch(() => null);
  if (!body?.content?.trim()) return err("content is required");

  const { content, entryDate, source = "user", authorName = "You", listId, taskId, metadata } = body;

  if (!entryDate || !/^\d{4}-\d{2}-\d{2}$/.test(entryDate)) {
    return err("entryDate required (YYYY-MM-DD)");
  }

  // Mark past-dated if the entry date is before today (local)
  const todayStr = new Date().toISOString().slice(0, 10);
  const isPastDated = entryDate < todayStr;

  const [entry] = await db
    .insert(bitacoraEntries)
    .values({
      userId,
      content: content.trim(),
      entryDate,
      source,
      authorName,
      listId: listId ?? null,
      taskId: taskId ?? null,
      isPastDated,
      metadata: metadata ? JSON.stringify(metadata) : null,
    })
    .returning();

  return ok(entry, 201);
}
