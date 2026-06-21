import { NextRequest } from "next/server";
import { db, tasks } from "@/lib/db";
import { resolveUserId } from "@/lib/auth-helpers";
import { ok, err, unauthorized } from "@/lib/api-response";
import { eq, and } from "drizzle-orm";

// PATCH /api/tasks/reorder  { ids: string[] }
// Sets sortOrder = index for each task id (ownership-verified)
export async function PATCH(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) return unauthorized();

  const body = await req.json().catch(() => null);
  if (!Array.isArray(body?.ids)) return err("ids array required");

  const ids: string[] = body.ids;

  await Promise.all(
    ids.map((id, index) =>
      db
        .update(tasks)
        .set({ sortOrder: index })
        .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
    )
  );

  return ok({ reordered: ids.length });
}
