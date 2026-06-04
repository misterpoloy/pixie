import { NextRequest } from "next/server";
import { db, lists } from "@/lib/db";
import { resolveUserId } from "@/lib/auth-helpers";
import { createListSchema } from "@/lib/validators";
import { ok, err, unauthorized } from "@/lib/api-response";
import { eq, and, asc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) return unauthorized();

  const rows = await db
    .select()
    .from(lists)
    .where(and(eq(lists.userId, userId), eq(lists.archived, false)))
    .orderBy(asc(lists.sortOrder), asc(lists.createdAt));

  return ok(rows);
}

export async function POST(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) return unauthorized();

  const body = await req.json().catch(() => null);
  const parsed = createListSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0].message);

  const [list] = await db
    .insert(lists)
    .values({ ...parsed.data, userId })
    .returning();

  return ok(list, 201);
}
