/**
 * Pixie native MCP endpoint — Streamable HTTP transport
 *
 * Auth: Bearer pix_xxx API key (pre-validated; authInfo injected into factory ctx)
 * Tools: 13 tools covering tasks, lists, labels, notes, and bitacora
 * Pattern: per-request McpServer factory with userId in closure
 *
 * Compatible with: eagle-62 (OpenClaw), GitHub Copilot, Claude Desktop, Cursor
 * Future: add OAuth 2.1 resource-server layer for community auth
 */

import { type AuthInfo, McpServer, createMcpHandler } from "@modelcontextprotocol/server";
import type { McpRequestContext } from "@modelcontextprotocol/server";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  and, asc, desc, eq, gte, ilike, inArray, isNull, lte, or,
} from "drizzle-orm";
import { db } from "@/lib/db";
import {
  bitacoraEntries,
  labels,
  lists,
  notes,
  taskLabels,
  tasks,
} from "@/lib/db/schema";
import { resolveUserId } from "@/lib/auth-helpers";

// ─── Date helpers (inline — avoid importing a shared module that might not exist) ──

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}
function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

// ─── Label enrichment ────────────────────────────────────────────────────────

type AnyRow = Record<string, unknown>;

async function withLabels(rows: AnyRow[]): Promise<AnyRow[]> {
  if (!rows.length) return rows;
  const ids = rows.map((r) => r.id as string);
  const joins = await db
    .select({
      taskId: taskLabels.taskId,
      id: labels.id,
      name: labels.name,
      color: labels.color,
    })
    .from(taskLabels)
    .innerJoin(labels, eq(taskLabels.labelId, labels.id))
    .where(inArray(taskLabels.taskId, ids));
  const byTask: Record<string, typeof joins> = {};
  for (const j of joins) {
    (byTask[j.taskId] ??= []).push(j);
  }
  return rows.map((r) => ({ ...r, labels: byTask[r.id as string] ?? [] }));
}

// ─── Tool registration ────────────────────────────────────────────────────────

function registerPixieTools(server: McpServer, userId: string) {
  // ── list_tasks ──────────────────────────────────────────────────────────────
  server.registerTool(
    "list_tasks",
    {
      description:
        "List tasks for the authenticated user. Supports smart views (today/tomorrow/upcoming/someday), a specific date, list, status, and parent filters.",
      inputSchema: z.object({
        view: z
          .enum(["today", "tomorrow", "upcoming", "someday"])
          .optional()
          .describe("Smart view"),
        date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional()
          .describe("Specific date YYYY-MM-DD"),
        listId: z.string().uuid().optional().describe("Filter by list ID"),
        status: z
          .enum(["pending", "in_progress", "done", "cancelled"])
          .optional(),
        parentId: z
          .string()
          .uuid()
          .optional()
          .describe("Return subtasks of this parent"),
        rootOnly: z
          .boolean()
          .optional()
          .describe("Only top-level tasks (no subtasks)"),
      }),
    },
    async (input) => {
      const conds = [eq(tasks.userId, userId)];
      if (input.listId) conds.push(eq(tasks.listId, input.listId));
      if (input.status) conds.push(eq(tasks.status, input.status as "pending" | "in_progress" | "done" | "cancelled"));
      if (input.parentId) {
        conds.push(eq(tasks.parentId, input.parentId));
      } else if (input.rootOnly) {
        conds.push(isNull(tasks.parentId));
      }

      const now = new Date();
      if (input.date) {
        const [y, m, d] = input.date.split("-").map(Number);
        conds.push(
          gte(tasks.dueDate, new Date(y, m - 1, d, 0, 0, 0)),
          lte(tasks.dueDate, new Date(y, m - 1, d, 23, 59, 59, 999)),
        );
      } else if (input.view === "today") {
        conds.push(lte(tasks.dueDate, endOfDay(now)));
      } else if (input.view === "tomorrow") {
        const tom = addDays(now, 1);
        conds.push(gte(tasks.dueDate, startOfDay(tom)), lte(tasks.dueDate, endOfDay(tom)));
      } else if (input.view === "upcoming") {
        conds.push(eq(tasks.isUpcoming, true));
      } else if (input.view === "someday") {
        conds.push(eq(tasks.isSomeday, true));
      }

      const parentRows = (await db
        .select()
        .from(tasks)
        .where(and(...conds))
        .orderBy(asc(tasks.sortOrder), asc(tasks.createdAt))) as AnyRow[];

      // Also pull subtasks of the returned parents
      const childRows: AnyRow[] = parentRows.length
        ? (await db
            .select()
            .from(tasks)
            .where(
              and(
                eq(tasks.userId, userId),
                inArray(
                  tasks.parentId,
                  parentRows.map((r) => r.id as string),
                ),
              ),
            )
            .orderBy(asc(tasks.sortOrder), asc(tasks.createdAt))) as AnyRow[]
        : [];

      const all = await withLabels([...parentRows, ...childRows]);
      return { content: [{ type: "text" as const, text: JSON.stringify(all, null, 2) }] };
    },
  );

  // ── create_task ─────────────────────────────────────────────────────────────
  server.registerTool(
    "create_task",
    {
      description: "Create a new task.",
      inputSchema: z.object({
        title: z.string().min(1).max(2000),
        notes: z.string().max(10000).optional(),
        listId: z.string().uuid().optional().nullable(),
        parentId: z.string().uuid().optional().nullable(),
        priority: z.enum(["none", "low", "medium", "high"]).optional(),
        dueDate: z
          .string()
          .datetime()
          .optional()
          .nullable()
          .describe("ISO-8601 datetime"),
        dueTime: z
          .string()
          .regex(/^\d{2}:\d{2}$/)
          .optional()
          .nullable()
          .describe("HH:MM"),
        isSomeday: z.boolean().optional(),
        isUpcoming: z.boolean().optional(),
        isInbox: z.boolean().optional(),
        labelIds: z.array(z.string().uuid()).optional(),
        recurrence: z
          .string()
          .max(500)
          .optional()
          .nullable()
          .describe("iCal RRULE string"),
      }),
    },
    async (input) => {
      const { labelIds, dueDate, isSomeday, isUpcoming, ...rest } = input;
      const flags =
        isSomeday
          ? { isSomeday: true, isUpcoming: false }
          : isUpcoming
            ? { isSomeday: false, isUpcoming: true }
            : {};

      const [task] = await db
        .insert(tasks)
        .values({
          ...rest,
          ...flags,
          userId,
          dueDate: dueDate ? new Date(dueDate) : null,
          updatedBy: "eagle-62",
        })
        .returning();

      if (labelIds?.length) {
        await db
          .insert(taskLabels)
          .values(labelIds.map((labelId) => ({ taskId: task.id, labelId })));
      }

      const [enriched] = await withLabels([task as AnyRow]);
      return { content: [{ type: "text" as const, text: JSON.stringify(enriched, null, 2) }] };
    },
  );

  // ── update_task ─────────────────────────────────────────────────────────────
  server.registerTool(
    "update_task",
    {
      description: "Update fields on an existing task.",
      inputSchema: z.object({
        id: z.string().uuid(),
        title: z.string().min(1).max(2000).optional(),
        notes: z.string().max(10000).optional().nullable(),
        status: z.enum(["pending", "in_progress", "done", "cancelled"]).optional(),
        priority: z.enum(["none", "low", "medium", "high"]).optional(),
        dueDate: z.string().datetime().optional().nullable(),
        dueTime: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
        isSomeday: z.boolean().optional(),
        isUpcoming: z.boolean().optional(),
        listId: z.string().uuid().optional().nullable(),
        parentId: z.string().uuid().optional().nullable(),
        labelIds: z.array(z.string().uuid()).optional(),
        recurrence: z.string().max(500).optional().nullable(),
        completedAt: z.string().datetime().optional().nullable(),
        hideOverdue: z.boolean().optional(),
      }),
    },
    async (input) => {
      const { id, labelIds, dueDate, completedAt, isSomeday, isUpcoming, ...rest } = input;

      const [existing] = await db
        .select({ userId: tasks.userId })
        .from(tasks)
        .where(and(eq(tasks.id, id), eq(tasks.userId, userId)));
      if (!existing) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: "Task not found or not yours" }) }],
          isError: true,
        };
      }

      const flags =
        isSomeday
          ? { isSomeday: true, isUpcoming: false }
          : isUpcoming
            ? { isSomeday: false, isUpcoming: true }
            : {};

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const patch: Record<string, any> = {
        ...rest,
        ...flags,
        updatedBy: "eagle-62",
        updatedAt: new Date(),
      };
      if (dueDate !== undefined) patch.dueDate = dueDate ? new Date(dueDate) : null;
      if (completedAt !== undefined)
        patch.completedAt = completedAt ? new Date(completedAt) : null;

      const [updated] = await db
        .update(tasks)
        .set(patch)
        .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
        .returning();

      if (labelIds !== undefined) {
        await db.delete(taskLabels).where(eq(taskLabels.taskId, id));
        if (labelIds.length) {
          await db
            .insert(taskLabels)
            .values(labelIds.map((labelId) => ({ taskId: id, labelId })));
        }
      }

      const [enriched] = await withLabels([updated as AnyRow]);
      return { content: [{ type: "text" as const, text: JSON.stringify(enriched, null, 2) }] };
    },
  );

  // ── delete_task ─────────────────────────────────────────────────────────────
  server.registerTool(
    "delete_task",
    {
      description: "Delete a task by ID.",
      inputSchema: z.object({ id: z.string().uuid() }),
    },
    async ({ id }) => {
      const [deleted] = await db
        .delete(tasks)
        .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
        .returning({ id: tasks.id });
      if (!deleted) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: "Task not found or not yours" }) }],
          isError: true,
        };
      }
      return { content: [{ type: "text" as const, text: JSON.stringify({ deleted: true, id }) }] };
    },
  );

  // ── search_tasks ────────────────────────────────────────────────────────────
  server.registerTool(
    "search_tasks",
    {
      description:
        "Full-text search over task titles, task notes, and standalone note content. Returns matching tasks and notes.",
      inputSchema: z.object({
        q: z.string().min(1).max(500).describe("Search query"),
        status: z.enum(["pending", "in_progress", "done", "cancelled"]).optional(),
        listId: z.string().uuid().optional(),
        view: z.enum(["today", "tomorrow", "upcoming", "someday"]).optional(),
        limit: z.number().int().min(1).max(100).optional().default(20),
      }),
    },
    async (input) => {
      const now = new Date();
      const taskConds = [
        eq(tasks.userId, userId),
        or(ilike(tasks.title, `%${input.q}%`), ilike(tasks.notes, `%${input.q}%`))!,
      ];
      if (input.status) taskConds.push(eq(tasks.status, input.status as "pending" | "in_progress" | "done" | "cancelled"));
      if (input.listId) taskConds.push(eq(tasks.listId, input.listId));
      if (input.view === "today") {
        taskConds.push(gte(tasks.dueDate, startOfDay(now)), lte(tasks.dueDate, endOfDay(now)));
      } else if (input.view === "tomorrow") {
        const tom = addDays(now, 1);
        taskConds.push(gte(tasks.dueDate, startOfDay(tom)), lte(tasks.dueDate, endOfDay(tom)));
      } else if (input.view === "upcoming") {
        taskConds.push(eq(tasks.isUpcoming, true));
      } else if (input.view === "someday") {
        taskConds.push(eq(tasks.isSomeday, true));
      }

      const [taskRows, noteRows] = await Promise.all([
        db
          .select()
          .from(tasks)
          .where(and(...taskConds))
          .orderBy(desc(tasks.updatedAt))
          .limit(input.limit ?? 20),
        db
          .select()
          .from(notes)
          .where(
            and(
              eq(notes.userId, userId),
              or(ilike(notes.content, `%${input.q}%`), ilike(notes.title, `%${input.q}%`))!,
            ),
          )
          .limit(5),
      ]);

      const enrichedTasks = await withLabels(taskRows as AnyRow[]);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ tasks: enrichedTasks, notes: noteRows }, null, 2),
          },
        ],
      };
    },
  );

  // ── list_lists ──────────────────────────────────────────────────────────────
  server.registerTool(
    "list_lists",
    {
      description: "Get all lists for the authenticated user.",
      inputSchema: z.object({
        includeArchived: z.boolean().optional().default(false),
      }),
    },
    async ({ includeArchived }) => {
      const conds = [eq(lists.userId, userId)];
      if (!includeArchived) conds.push(eq(lists.archived, false));
      const rows = await db
        .select()
        .from(lists)
        .where(and(...conds))
        .orderBy(asc(lists.sortOrder), asc(lists.createdAt));
      return { content: [{ type: "text" as const, text: JSON.stringify(rows, null, 2) }] };
    },
  );

  // ── create_list ─────────────────────────────────────────────────────────────
  server.registerTool(
    "create_list",
    {
      description: "Create a new list or project.",
      inputSchema: z.object({
        name: z.string().min(1).max(255),
        description: z.string().max(1000).optional(),
        color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
        type: z.enum(["list", "project", "inbox"]).optional().default("list"),
      }),
    },
    async (input) => {
      const [list] = await db.insert(lists).values({ ...input, userId }).returning();
      return { content: [{ type: "text" as const, text: JSON.stringify(list, null, 2) }] };
    },
  );

  // ── list_labels ─────────────────────────────────────────────────────────────
  server.registerTool(
    "list_labels",
    {
      description: "Get all labels for the authenticated user.",
      inputSchema: z.object({}),
    },
    async () => {
      const rows = await db
        .select()
        .from(labels)
        .where(eq(labels.userId, userId))
        .orderBy(asc(labels.name));
      return { content: [{ type: "text" as const, text: JSON.stringify(rows, null, 2) }] };
    },
  );

  // ── create_label ────────────────────────────────────────────────────────────
  server.registerTool(
    "create_label",
    {
      description: "Create a new label for tagging tasks.",
      inputSchema: z.object({
        name: z.string().min(1).max(100),
        color: z
          .string()
          .regex(/^#[0-9a-fA-F]{6}$/)
          .optional()
          .describe("Hex color, e.g. #6C63FF"),
      }),
    },
    async (input) => {
      const [label] = await db.insert(labels).values({ ...input, userId }).returning();
      return { content: [{ type: "text" as const, text: JSON.stringify(label, null, 2) }] };
    },
  );

  // ── create_note ─────────────────────────────────────────────────────────────
  server.registerTool(
    "create_note",
    {
      description: "Create a standalone note, optionally linked to a task or list.",
      inputSchema: z.object({
        title: z.string().max(255).optional(),
        content: z.string().max(50000).optional(),
        taskId: z.string().uuid().optional().nullable(),
        listId: z.string().uuid().optional().nullable(),
        pinned: z.boolean().optional(),
      }),
    },
    async (input) => {
      const [note] = await db
        .insert(notes)
        .values({ ...input, userId, content: input.content ?? "" })
        .returning();
      return { content: [{ type: "text" as const, text: JSON.stringify(note, null, 2) }] };
    },
  );

  // ── list_notes ──────────────────────────────────────────────────────────────
  server.registerTool(
    "list_notes",
    {
      description: "List notes for the user, with optional filters.",
      inputSchema: z.object({
        taskId: z.string().uuid().optional(),
        listId: z.string().uuid().optional(),
        pinned: z.boolean().optional(),
        limit: z.number().int().min(1).max(100).optional().default(50),
      }),
    },
    async (input) => {
      const conds = [eq(notes.userId, userId)];
      if (input.taskId) conds.push(eq(notes.taskId, input.taskId));
      if (input.listId) conds.push(eq(notes.listId, input.listId));
      if (input.pinned !== undefined) conds.push(eq(notes.pinned, input.pinned));
      const rows = await db
        .select()
        .from(notes)
        .where(and(...conds))
        .orderBy(desc(notes.updatedAt))
        .limit(input.limit ?? 50);
      return { content: [{ type: "text" as const, text: JSON.stringify(rows, null, 2) }] };
    },
  );

  // ── list_bitacora ───────────────────────────────────────────────────────────
  server.registerTool(
    "list_bitacora",
    {
      description:
        "List bitacora (daily log/journal) entries. Defaults to today. Supports a specific date or a date range.",
      inputSchema: z.object({
        date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional()
          .describe("Specific date YYYY-MM-DD (defaults to today)"),
        from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        limit: z.number().int().min(1).max(200).optional().default(50),
      }),
    },
    async (input) => {
      const conds = [eq(bitacoraEntries.userId, userId)];
      if (input.from || input.to) {
        if (input.from) conds.push(gte(bitacoraEntries.entryDate, input.from));
        if (input.to) conds.push(lte(bitacoraEntries.entryDate, input.to));
      } else {
        const target = input.date ?? new Date().toISOString().slice(0, 10);
        conds.push(eq(bitacoraEntries.entryDate, target));
      }
      const rows = await db
        .select()
        .from(bitacoraEntries)
        .where(and(...conds))
        .orderBy(desc(bitacoraEntries.createdAt))
        .limit(input.limit ?? 50);
      return { content: [{ type: "text" as const, text: JSON.stringify(rows, null, 2) }] };
    },
  );

  // ── create_bitacora ─────────────────────────────────────────────────────────
  server.registerTool(
    "create_bitacora",
    {
      description: "Add an entry to the daily bitacora (log/journal).",
      inputSchema: z.object({
        content: z.string().min(1).max(10000),
        entryDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional()
          .describe("YYYY-MM-DD — defaults to today"),
        source: z
          .string()
          .max(50)
          .optional()
          .default("agent")
          .describe("Producer identifier, e.g. 'eagle-62', 'user'"),
        authorName: z.string().max(255).optional().default("eagle-62"),
        listId: z.string().uuid().optional().nullable(),
        taskId: z.string().uuid().optional().nullable(),
      }),
    },
    async (input) => {
      const entryDate = input.entryDate ?? new Date().toISOString().slice(0, 10);
      const today = new Date().toISOString().slice(0, 10);
      const [entry] = await db
        .insert(bitacoraEntries)
        .values({
          ...input,
          entryDate,
          isPastDated: entryDate < today,
          userId,
          source: input.source ?? "agent",
          authorName: input.authorName ?? "eagle-62",
        })
        .returning();
      return { content: [{ type: "text" as const, text: JSON.stringify(entry, null, 2) }] };
    },
  );
}

// ─── MCP handler (singleton) — factory runs fresh per request ────────────────

const mcpHandler = createMcpHandler(
  (ctx: McpRequestContext) => {
    const userId = ctx.authInfo?.clientId;
    if (!userId) throw new Error("Unauthorized: missing authInfo.sub");
    const server = new McpServer({ name: "pixie-mcp", version: "1.0.0" });
    registerPixieTools(server, userId);
    return server;
  },
  { legacy: "stateless" },
);

// ─── Route handlers — validate Bearer auth, then delegate to MCP ──────────────

function buildAuthInfo(req: NextRequest): AuthInfo {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  return {
    token,
    clientId: "", // will be overwritten per-request below
    scopes: [],
    expiresAt: Math.floor(Date.now() / 1000) + 86_400 * 365, // 1 year
  };
}

async function routeHandler(req: NextRequest): Promise<Response> {
  const userId = await resolveUserId(req);
  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized: valid Bearer token required" },
      { status: 401 },
    );
  }
  const authInfo: AuthInfo = { ...buildAuthInfo(req), clientId: userId };
  return mcpHandler.fetch(req, { authInfo });
}

export const GET = routeHandler;
export const POST = routeHandler;
export const DELETE = routeHandler;
