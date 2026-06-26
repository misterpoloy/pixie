CREATE TABLE "bitacora_entries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "content" text NOT NULL,
  "entry_date" varchar(10) NOT NULL,
  "source" varchar(50) NOT NULL DEFAULT 'user',
  "author_name" varchar(255) NOT NULL DEFAULT 'You',
  "list_id" uuid REFERENCES "lists"("id") ON DELETE SET NULL,
  "task_id" uuid REFERENCES "tasks"("id") ON DELETE SET NULL,
  "is_past_dated" boolean NOT NULL DEFAULT false,
  "metadata" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX "bitacora_user_date_idx" ON "bitacora_entries" ("user_id", "entry_date");
CREATE INDEX "bitacora_list_idx" ON "bitacora_entries" ("list_id");
