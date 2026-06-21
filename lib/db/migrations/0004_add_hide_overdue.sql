ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "hide_overdue" boolean NOT NULL DEFAULT false;
