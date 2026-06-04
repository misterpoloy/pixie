import { NextRequest } from "next/server";
import { db, labels } from "@/lib/db";
import { resolveUserId } from "@/lib/auth-helpers";
import { createLabelSchema } from "@/lib/validators";
import { ok, err, unauthorized } from "@/lib/api-response";
import { eq, asc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) return unauthorized();

  const rows = await db.select().from(labels).where(eq(labels.userId, userId)).orderBy(asc(labels.name));
  return ok(rows);
}

export async function POST(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) return unauthorized();

  const body = await req.json().catch(() => null);
  const parsed = createLabelSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0].message);

  const [label] = await db.insert(labels).values({ ...parsed.data, userId }).returning();
  return ok(label, 201);
}
