import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { taskDayEntries, tasks } from "@/lib/db/schema";
import { resolveUserId } from "@/lib/auth-helpers";
import { eq, and } from "drizzle-orm";

// GET /api/calendar/day?date=YYYY-MM-DD
// Returns full task objects for every task that was open on the given date,
// joined from task_day_entries → tasks. No data duplication — tasks are
// fetched live but filtered through the historical snapshot index.
export async function GET(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ ok: false, error: "date required (YYYY-MM-DD)" }, { status: 400 });
  }

  const rows = await db
    .select({
      task: tasks,
      snapshotStatus: taskDayEntries.status,
    })
    .from(taskDayEntries)
    .innerJoin(tasks, eq(taskDayEntries.taskId, tasks.id))
    .where(
      and(
        eq(taskDayEntries.userId, userId),
        eq(taskDayEntries.date, date),
      )
    );

  return NextResponse.json({
    ok: true,
    data: rows.map((r) => ({ ...r.task, snapshotStatus: r.snapshotStatus })),
  });
}
