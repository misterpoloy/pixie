import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tasks, taskDayEntries } from "@/lib/db/schema";
import { resolveUserId } from "@/lib/auth-helpers";
import { eq, and, notInArray } from "drizzle-orm";

// POST /api/snapshot
// Snapshots all currently-open tasks for the authenticated user as today's
// day entries. Safe to call multiple times — ON CONFLICT DO NOTHING.
export async function POST(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 });

  // Use the caller's local date from the X-Local-Date header, fall back to UTC.
  const localDate = req.headers.get("x-local-date") ?? new Date().toISOString().slice(0, 10);

  const openTasks = await db
    .select({ id: tasks.id, status: tasks.status })
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, userId),
        notInArray(tasks.status, ["done", "cancelled"]),
      )
    );

  if (openTasks.length === 0) {
    return NextResponse.json({ ok: true, snapshotted: 0 });
  }

  await db
    .insert(taskDayEntries)
    .values(openTasks.map((t) => ({
      taskId: t.id,
      userId,
      date: localDate,
      status: t.status,
    })))
    .onConflictDoNothing();

  return NextResponse.json({ ok: true, snapshotted: openTasks.length });
}
