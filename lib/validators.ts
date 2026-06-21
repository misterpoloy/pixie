import { z } from "zod";

export const createUserSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(255).optional(),
});

export const createListSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  icon: z.string().max(50).optional(),
  type: z.enum(["list", "project", "inbox"]).optional(),
});

export const updateListSchema = createListSchema.partial().extend({
  sortOrder: z.number().int().optional(),
  archived: z.boolean().optional(),
});

export const createSectionSchema = z.object({
  listId: z.string().uuid(),
  name: z.string().min(1).max(255),
  sortOrder: z.number().int().optional(),
});

export const createTaskSchema = z.object({
  title: z.string().min(1).max(2000),
  notes: z.string().max(10000).optional(),
  listId: z.string().uuid().optional().nullable(),
  sectionId: z.string().uuid().optional().nullable(),
  parentId: z.string().uuid().optional().nullable(),
  priority: z.enum(["none", "low", "medium", "high"]).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  dueTime: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  isSomeday: z.boolean().optional(),
  isUpcoming: z.boolean().optional(),
  isInbox: z.boolean().optional(),
  labelIds: z.array(z.string().uuid()).optional(),
  sortOrder: z.number().int().optional(),
  coverImage: z.string().url().optional().nullable(),
  hideOverdue: z.boolean().optional(),
});

export const updateTaskSchema = createTaskSchema.partial().extend({
  status: z.enum(["pending", "in_progress", "done", "cancelled"]).optional(),
  completedAt: z.string().datetime().optional().nullable(),
});

export const createLabelSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

export const createNoteSchema = z.object({
  title: z.string().max(255).optional(),
  content: z.string().max(50000).optional(),
  taskId: z.string().uuid().optional().nullable(),
  listId: z.string().uuid().optional().nullable(),
  pinned: z.boolean().optional(),
});

export const updateNoteSchema = createNoteSchema.partial();

export const searchSchema = z.object({
  q: z.string().min(1).max(500),
  labelIds: z.array(z.string().uuid()).optional(),
  status: z.enum(["pending", "in_progress", "done", "cancelled"]).optional(),
  listId: z.string().uuid().optional(),
  view: z.enum(["today", "tomorrow", "upcoming", "someday"]).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export const calendarQuerySchema = z.object({
  start: z.string().datetime(),
  end: z.string().datetime(),
});
