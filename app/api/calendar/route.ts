import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { taskDayEntries } from "@/lib/db/schema";
import { resolveUserId } from "@/lib/auth-helpers";
import { eq, and, gte, lte, count } from "drizzle-orm";

// GET /api/calendar?start=YYYY-MM-DD&end=YYYY-MM-DD
// Returns [{date, count}] — one row per day that has open-task snapshots.
// Single GROUP BY query → O(distinct days in range).
export async function GET(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  if (!start || !end) {
    return NextResponse.json({ ok: false, error: "start and end required" }, { status: 400 });
  }

  const rows = await db
    .select({ date: taskDayEntries.date, count: count() })
    .from(taskDayEntries)
    .where(
      and(
        eq(taskDayEntries.userId, userId),
        gte(taskDayEntries.date, start),
        lte(taskDayEntries.date, end),
      )
    )
    .groupBy(taskDayEntries.date);

  return NextResponse.json({ ok: true, data: rows });
}
