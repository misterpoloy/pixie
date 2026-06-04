import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

// ─── Seed credentials ─────────────────────────────────────────────────────────
// Change these before running in any shared/production environment.
// The password is bcrypt-hashed before being stored — never plaintext in the DB.
const SEED_EMAIL = "admin@pixie.local";
const SEED_PASSWORD = "pixie-dev-2025!";
const SEED_NAME = "Pixie Admin";
// ─────────────────────────────────────────────────────────────────────────────

async function seed() {
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql, { schema });

  console.log("🌱 Seeding Pixie database…");

  // Upsert user — safe to re-run
  const [existing] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, SEED_EMAIL))
    .limit(1);

  if (existing) {
    console.log(`✓ User already exists: ${SEED_EMAIL} (id: ${existing.id})`);
  } else {
    const passwordHash = await bcrypt.hash(SEED_PASSWORD, 12);
    const [user] = await db
      .insert(schema.users)
      .values({ email: SEED_EMAIL, name: SEED_NAME, passwordHash })
      .returning({ id: schema.users.id });

    console.log(`✓ Created user: ${SEED_EMAIL} (id: ${user.id})`);

    // Seed a default inbox list for the user
    await db.insert(schema.lists).values({
      userId: user.id,
      name: "Inbox",
      type: "inbox",
      color: "#7c6ef7",
      icon: "📥",
      sortOrder: 0,
    });
    console.log("✓ Created default Inbox list");

    // Seed a sample label
    await db.insert(schema.labels).values([
      { userId: user.id, name: "personal", color: "#30d158" },
      { userId: user.id, name: "work",     color: "#0a84ff" },
      { userId: user.id, name: "urgent",   color: "#ff453a" },
    ]);
    console.log("✓ Created sample labels: personal, work, urgent");
  }

  console.log("");
  console.log("─────────────────────────────────────");
  console.log("  Login credentials");
  console.log("─────────────────────────────────────");
  console.log(`  Email    : ${SEED_EMAIL}`);
  console.log(`  Password : ${SEED_PASSWORD}`);
  console.log("─────────────────────────────────────");
  console.log("  ⚠  Change these before sharing the DB!");
  console.log("");
}

seed().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
