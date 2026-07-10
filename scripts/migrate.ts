/**
 * Idempotent migration runner.
 * Reads every *.sql file in lib/db/migrations/ in filename order,
 * tracks which have already run in a `_migrations` table, and applies
 * only the new ones. Safe to re-run on every deploy.
 */

import { neon } from "@neondatabase/serverless";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

// Load .env.local for local dev; Vercel injects env vars at build time
dotenv.config({ path: ".env.local" });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌  DATABASE_URL is not set");
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function run() {
  // Ensure tracking table exists
  await sql`
    CREATE TABLE IF NOT EXISTS _migrations (
      id        serial PRIMARY KEY,
      filename  varchar(255) NOT NULL UNIQUE,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  const migrationsDir = path.join(process.cwd(), "lib", "db", "migrations");
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const filename of files) {
    const [existing] = await sql`
      SELECT id FROM _migrations WHERE filename = ${filename}
    `;
    if (existing) {
      console.log(`  ✓ ${filename} (already applied)`);
      continue;
    }

    const filepath = path.join(migrationsDir, filename);
    const raw = fs.readFileSync(filepath, "utf-8");

    // Drizzle uses `--> statement-breakpoint` as a separator; hand-written
    // migration files often skip it and just rely on trailing semicolons, so
    // split on both to guarantee one statement per query() call — Postgres's
    // extended query protocol (which query() uses) rejects multiple commands
    // in a single statement.
    const statements = raw
      .split("--> statement-breakpoint")
      .flatMap((chunk) => chunk.split(";"))
      .map((s) => s.trim())
      .filter(Boolean);

    console.log(`  ⏳ Applying ${filename} (${statements.length} statement${statements.length !== 1 ? "s" : ""})…`);

    for (const statement of statements) {
      // sql.unsafe() only builds a raw-SQL fragment for embedding inside a
      // tagged-template query — it does not execute anything on its own.
      // sql.query() is the driver's actual "run this SQL string" method.
      await sql.query(statement);
    }

    await sql`INSERT INTO _migrations (filename) VALUES (${filename})`;
    console.log(`  ✅ ${filename}`);
  }

  console.log("\nAll migrations up to date.");
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
