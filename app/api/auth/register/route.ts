import { NextRequest } from "next/server";
import { db, users } from "@/lib/db";
import { createUserSchema } from "@/lib/validators";
import { ok, err } from "@/lib/api-response";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0].message);

  const { email, password, name } = parsed.data;

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing) return err("Email already registered", 409);

  const passwordHash = await bcrypt.hash(password, 12);
  const [user] = await db.insert(users).values({ email, passwordHash, name }).returning({
    id: users.id,
    email: users.email,
    name: users.name,
  });

  return ok(user, 201);
}
