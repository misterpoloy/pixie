import { NextRequest, NextResponse } from "next/server";
import { resolveUserId } from "@/lib/auth-helpers";
import { unauthorized } from "@/lib/api-response";

// MCP tool manifest — LLMs use this to discover available tools
export async function GET(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) return unauthorized();

  return NextResponse.json({
    name: "pixie",
    description: "Pixie task management MCP server",
    version: "1.0.0",
    tools: [
      {
        name: "list_tasks",
        description: "Retrieve tasks with optional filters",
        inputSchema: {
          type: "object",
          properties: {
            view: { type: "string", enum: ["today", "tomorrow", "upcoming", "someday"] },
            listId: { type: "string", description: "Filter by list UUID" },
            status: { type: "string", enum: ["pending", "in_progress", "done", "cancelled"] },
            parentId: { type: "string", description: "Get subtasks of this task UUID, or 'null' for top-level" },
          },
        },
      },
      {
        name: "create_task",
        description: "Create a new task",
        inputSchema: {
          type: "object",
          required: ["title"],
          properties: {
            title: { type: "string" },
            notes: { type: "string" },
            listId: { type: "string" },
            parentId: { type: "string", description: "Parent task UUID for subtask" },
            dueDate: { type: "string", format: "date-time" },
            priority: { type: "string", enum: ["none", "low", "medium", "high"] },
            isSomeday: { type: "boolean" },
            isUpcoming: { type: "boolean" },
            labelIds: { type: "array", items: { type: "string" } },
          },
        },
      },
      {
        name: "update_task",
        description: "Update an existing task by ID",
        inputSchema: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            status: { type: "string", enum: ["pending", "in_progress", "done", "cancelled"] },
            dueDate: { type: "string", format: "date-time" },
            priority: { type: "string", enum: ["none", "low", "medium", "high"] },
            notes: { type: "string" },
            isSomeday: { type: "boolean" },
            isUpcoming: { type: "boolean" },
          },
        },
      },
      {
        name: "delete_task",
        description: "Delete a task by ID",
        inputSchema: {
          type: "object",
          required: ["id"],
          properties: { id: { type: "string" } },
        },
      },
      {
        name: "search_tasks",
        description: "Full-text search across tasks and notes",
        inputSchema: {
          type: "object",
          required: ["q"],
          properties: {
            q: { type: "string" },
            labelIds: { type: "array", items: { type: "string" } },
            status: { type: "string" },
            view: { type: "string", enum: ["today", "tomorrow", "upcoming", "someday"] },
          },
        },
      },
      {
        name: "list_lists",
        description: "Get all user lists",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "create_list",
        description: "Create a new list",
        inputSchema: {
          type: "object",
          required: ["name"],
          properties: {
            name: { type: "string" },
            color: { type: "string" },
            type: { type: "string", enum: ["list", "project", "inbox"] },
          },
        },
      },
      {
        name: "list_labels",
        description: "Get all user labels",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "create_note",
        description: "Create a note, optionally attached to a task or list",
        inputSchema: {
          type: "object",
          properties: {
            title: { type: "string" },
            content: { type: "string" },
            taskId: { type: "string" },
            listId: { type: "string" },
          },
        },
      },
    ],
  });
}

// MCP tool execution endpoint
export async function POST(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) return unauthorized();

  const body = await req.json().catch(() => null);
  if (!body?.tool || !body?.input) {
    return NextResponse.json({ error: "Missing tool or input" }, { status: 400 });
  }

  const baseUrl = new URL(req.url).origin;
  const authHeader = req.headers.get("authorization") ?? "";

  const forwardHeaders = {
    "Content-Type": "application/json",
    Authorization: authHeader,
  };

  const { tool, input } = body;

  try {
    let res: Response;

    switch (tool) {
      case "list_tasks": {
        const params = new URLSearchParams();
        if (input.view) params.set("view", input.view);
        if (input.listId) params.set("listId", input.listId);
        if (input.status) params.set("status", input.status);
        if (input.parentId) params.set("parentId", input.parentId);
        res = await fetch(`${baseUrl}/api/tasks?${params}`, { headers: forwardHeaders });
        break;
      }
      case "create_task":
        res = await fetch(`${baseUrl}/api/tasks`, { method: "POST", headers: forwardHeaders, body: JSON.stringify(input) });
        break;
      case "update_task": {
        const { id, ...rest } = input;
        res = await fetch(`${baseUrl}/api/tasks/${id}`, { method: "PATCH", headers: forwardHeaders, body: JSON.stringify(rest) });
        break;
      }
      case "delete_task":
        res = await fetch(`${baseUrl}/api/tasks/${input.id}`, { method: "DELETE", headers: forwardHeaders });
        break;
      case "search_tasks": {
        const params = new URLSearchParams(input as Record<string, string>);
        res = await fetch(`${baseUrl}/api/search?${params}`, { headers: forwardHeaders });
        break;
      }
      case "list_lists":
        res = await fetch(`${baseUrl}/api/lists`, { headers: forwardHeaders });
        break;
      case "create_list":
        res = await fetch(`${baseUrl}/api/lists`, { method: "POST", headers: forwardHeaders, body: JSON.stringify(input) });
        break;
      case "list_labels":
        res = await fetch(`${baseUrl}/api/labels`, { headers: forwardHeaders });
        break;
      case "create_note":
        res = await fetch(`${baseUrl}/api/notes`, { method: "POST", headers: forwardHeaders, body: JSON.stringify(input) });
        break;
      default:
        return NextResponse.json({ error: `Unknown tool: ${tool}` }, { status: 400 });
    }

    const data = await res.json();
    return NextResponse.json({ tool, result: data });
  } catch (e) {
    return NextResponse.json({ error: "Tool execution failed" }, { status: 500 });
  }
}
