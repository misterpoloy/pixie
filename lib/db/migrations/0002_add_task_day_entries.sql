CREATE TABLE "task_day_entries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "task_id" uuid NOT NULL REFERENCES "tasks"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "date" varchar(10) NOT NULL,
  "status" "task_status" NOT NULL,
  CONSTRAINT "tde_task_date_unique" UNIQUE("task_id", "date")
);
CREATE INDEX "tde_user_date_idx" ON "task_day_entries" ("user_id", "date");
