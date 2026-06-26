import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  integer,
  pgEnum,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const taskStatusEnum = pgEnum("task_status", [
  "pending",
  "in_progress",
  "done",
  "cancelled",
]);

export const taskPriorityEnum = pgEnum("task_priority", [
  "none",
  "low",
  "medium",
  "high",
]);

export const listTypeEnum = pgEnum("list_type", [
  "list",     // normal flat list
  "project",  // has sections / nested tasks
  "inbox",    // system inbox
]);

export const viewTypeEnum = pgEnum("view_type", [
  "today",
  "tomorrow",
  "upcoming",
  "someday",
]);

// ─── Users ────────────────────────────────────────────────────────────────────

// Users table extended with NextAuth required fields
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  name: varchar("name", { length: 255 }),
  image: text("image"),
  passwordHash: varchar("password_hash", { length: 255 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// NextAuth OAuth accounts
export const accounts = pgTable("accounts", {
  userId: uuid("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 50 }).notNull(),
  provider: varchar("provider", { length: 100 }).notNull(),
  providerAccountId: varchar("providerAccountId", { length: 255 }).notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: varchar("token_type", { length: 50 }),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
}, (t) => [unique().on(t.provider, t.providerAccountId)]);

export const sessions = pgTable("sessions", {
  sessionToken: varchar("sessionToken", { length: 512 }).primaryKey(),
  userId: uuid("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable("verificationTokens", {
  identifier: varchar("identifier", { length: 255 }).notNull(),
  token: varchar("token", { length: 512 }).notNull(),
  expires: timestamp("expires", { mode: "date" }).notNull(),
}, (t) => [unique().on(t.identifier, t.token)]);

// ─── Agent API Keys (for MCP / LLM access) ───────────────────────────────────

export const apiKeys = pgTable("api_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  keyHash: varchar("key_hash", { length: 512 }).notNull(),
  lastUsedAt: timestamp("last_used_at"),
  expiresAt: timestamp("expires_at"),
  scopes: text("scopes").array().notNull().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [index("api_keys_user_idx").on(t.userId)]);

// ─── Labels ───────────────────────────────────────────────────────────────────

export const labels = pgTable("labels", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  color: varchar("color", { length: 7 }).notNull().default("#6C63FF"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("labels_user_idx").on(t.userId),
  unique().on(t.userId, t.name),
]);

// ─── Lists ────────────────────────────────────────────────────────────────────

export const lists = pgTable("lists", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  color: varchar("color", { length: 7 }).notNull().default("#6C63FF"),
  icon: varchar("icon", { length: 50 }),
  type: listTypeEnum("type").notNull().default("list"),
  sortOrder: integer("sort_order").notNull().default(0),
  archived: boolean("archived").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [index("lists_user_idx").on(t.userId)]);

// ─── Sections (within a list/project) ────────────────────────────────────────

export const sections = pgTable("sections", {
  id: uuid("id").primaryKey().defaultRandom(),
  listId: uuid("list_id").notNull().references(() => lists.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  collapsed: boolean("collapsed").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [index("sections_list_idx").on(t.listId)]);

// ─── Tasks ────────────────────────────────────────────────────────────────────

export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  listId: uuid("list_id").references(() => lists.id, { onDelete: "set null" }),
  sectionId: uuid("section_id").references(() => sections.id, { onDelete: "set null" }),
  parentId: uuid("parent_id"),  // self-ref: sub-tasks — FK added below via relations
  title: text("title").notNull(),
  notes: text("notes"),
  status: taskStatusEnum("status").notNull().default("pending"),
  priority: taskPriorityEnum("priority").notNull().default("none"),
  dueDate: timestamp("due_date"),
  dueTime: varchar("due_time", { length: 5 }),  // HH:MM
  completedAt: timestamp("completed_at"),
  isSomeday: boolean("is_someday").notNull().default(false),
  isUpcoming: boolean("is_upcoming").notNull().default(false),
  isInbox: boolean("is_inbox").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  recurrence: text("recurrence"),  // iCal RRULE string for recurring tasks
  coverImage: text("cover_image"),
  hideOverdue: boolean("hide_overdue").notNull().default(false),
  updatedBy: varchar("updated_by", { length: 255 }),  // human name or agent identifier
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  index("tasks_user_idx").on(t.userId),
  index("tasks_list_idx").on(t.listId),
  index("tasks_parent_idx").on(t.parentId),
  index("tasks_due_date_idx").on(t.dueDate),
  index("tasks_upcoming_idx").on(t.isUpcoming),
  index("tasks_status_idx").on(t.status),
]);

// ─── Task Labels (join) ───────────────────────────────────────────────────────

export const taskLabels = pgTable("task_labels", {
  taskId: uuid("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  labelId: uuid("label_id").notNull().references(() => labels.id, { onDelete: "cascade" }),
}, (t) => [unique().on(t.taskId, t.labelId)]);

// ─── Notes (standalone, not just task notes) ─────────────────────────────────

export const notes = pgTable("notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  taskId: uuid("task_id").references(() => tasks.id, { onDelete: "cascade" }),
  listId: uuid("list_id").references(() => lists.id, { onDelete: "set null" }),
  title: varchar("title", { length: 255 }),
  content: text("content").notNull().default(""),
  pinned: boolean("pinned").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  index("notes_user_idx").on(t.userId),
  index("notes_task_idx").on(t.taskId),
]);

// ─── Task Day Entries (daily carry-forward snapshots) ────────────────────────
// One row per (task, date) — never duplicates task data.
// Index on (user_id, date) → O(1) count for any calendar day.

export const taskDayEntries = pgTable("task_day_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  taskId: uuid("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: varchar("date", { length: 10 }).notNull(),  // YYYY-MM-DD local date
  status: taskStatusEnum("status").notNull(),
}, (t) => [
  unique("tde_task_date_unique").on(t.taskId, t.date),
  index("tde_user_date_idx").on(t.userId, t.date),
]);

// ─── Task Comments ────────────────────────────────────────────────────────────

export const taskComments = pgTable("task_comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  taskId: uuid("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  authorName: varchar("author_name", { length: 255 }).notNull(),  // human or agent name
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("comments_task_idx").on(t.taskId),
]);

export type TaskComment = typeof taskComments.$inferSelect;
export type NewTaskComment = typeof taskComments.$inferInsert;

// ─── Relations ────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  lists: many(lists),
  tasks: many(tasks),
  labels: many(labels),
  notes: many(notes),
  apiKeys: many(apiKeys),
}));

export const listsRelations = relations(lists, ({ one, many }) => ({
  user: one(users, { fields: [lists.userId], references: [users.id] }),
  sections: many(sections),
  tasks: many(tasks),
  notes: many(notes),
}));

export const sectionsRelations = relations(sections, ({ one, many }) => ({
  list: one(lists, { fields: [sections.listId], references: [lists.id] }),
  user: one(users, { fields: [sections.userId], references: [users.id] }),
  tasks: many(tasks),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  user: one(users, { fields: [tasks.userId], references: [users.id] }),
  list: one(lists, { fields: [tasks.listId], references: [lists.id] }),
  section: one(sections, { fields: [tasks.sectionId], references: [sections.id] }),
  parent: one(tasks, { fields: [tasks.parentId], references: [tasks.id], relationName: "subtasks" }),
  subtasks: many(tasks, { relationName: "subtasks" }),
  taskLabels: many(taskLabels),
  notes: many(notes),
}));

export const labelsRelations = relations(labels, ({ one, many }) => ({
  user: one(users, { fields: [labels.userId], references: [users.id] }),
  taskLabels: many(taskLabels),
}));

export const taskLabelsRelations = relations(taskLabels, ({ one }) => ({
  task: one(tasks, { fields: [taskLabels.taskId], references: [tasks.id] }),
  label: one(labels, { fields: [taskLabels.labelId], references: [labels.id] }),
}));

export const notesRelations = relations(notes, ({ one }) => ({
  user: one(users, { fields: [notes.userId], references: [users.id] }),
  task: one(tasks, { fields: [notes.taskId], references: [tasks.id] }),
  list: one(lists, { fields: [notes.listId], references: [lists.id] }),
}));

// ─── Bitacora (daily log / journal) ──────────────────────────────────────────
// Extensible event log keyed by local date. source is a free varchar (not enum)
// so new producers (agents, integrations, webhooks) register without migrations.
// metadata jsonb handles future fields (mood, tags, ref IDs, run context, etc.).

export const bitacoraEntries = pgTable("bitacora_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  entryDate: varchar("entry_date", { length: 10 }).notNull(), // YYYY-MM-DD local date
  source: varchar("source", { length: 50 }).notNull().default("user"),   // 'user'|'agent'|'system'|anything
  authorName: varchar("author_name", { length: 255 }).notNull().default("You"),
  listId: uuid("list_id").references(() => lists.id, { onDelete: "set null" }),
  taskId: uuid("task_id").references(() => tasks.id, { onDelete: "set null" }),
  isPastDated: boolean("is_past_dated").notNull().default(false), // entry written for a past date
  metadata: text("metadata"), // JSON string — jsonb-style extensibility without pgTyping overhead
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  index("bitacora_user_date_idx").on(t.userId, t.entryDate),
  index("bitacora_list_idx").on(t.listId),
]);

export type BitacoraEntry = typeof bitacoraEntries.$inferSelect;
export type NewBitacoraEntry = typeof bitacoraEntries.$inferInsert;

export const bitacoraRelations = relations(bitacoraEntries, ({ one }) => ({
  user: one(users, { fields: [bitacoraEntries.userId], references: [users.id] }),
  list: one(lists, { fields: [bitacoraEntries.listId], references: [lists.id] }),
  task: one(tasks, { fields: [bitacoraEntries.taskId], references: [tasks.id] }),
}));

// ─── Types ────────────────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type List = typeof lists.$inferSelect;
export type NewList = typeof lists.$inferInsert;
export type Section = typeof sections.$inferSelect;
export type NewSection = typeof sections.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type Label = typeof labels.$inferSelect;
export type NewLabel = typeof labels.$inferInsert;
export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;
export type ApiKey = typeof apiKeys.$inferSelect;
export type TaskDayEntry = typeof taskDayEntries.$inferSelect;
export type NewTaskDayEntry = typeof taskDayEntries.$inferInsert;
