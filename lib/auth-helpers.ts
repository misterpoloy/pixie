import { auth } from "./auth";
import { db, apiKeys } from "./db";
import { eq, and, gt, or, isNull } from "drizzle-orm";
import { createHash } from "crypto";
import { NextRequest } from "next/server";

export async function getSession() {
  return auth();
}

export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session;
}

function hashKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

// Validate Bearer token — supports both JWT sessions and API keys
export async function resolveUserId(req: NextRequest): Promise<string | null> {
  const auth_header = req.headers.get("authorization");

  if (auth_header?.startsWith("Bearer ")) {
    const token = auth_header.slice(7);

    // Try API key lookup
    const keyHash = hashKey(token);
    const now = new Date();
    const [apiKey] = await db
      .select()
      .from(apiKeys)
      .where(
        and(
          eq(apiKeys.keyHash, keyHash),
          or(isNull(apiKeys.expiresAt), gt(apiKeys.expiresAt, now))
        )
      )
      .limit(1);

    if (apiKey) {
      // Update last used async (fire and forget)
      db.update(apiKeys)
        .set({ lastUsedAt: now })
        .where(eq(apiKeys.id, apiKey.id))
        .catch(() => {});
      return apiKey.userId;
    }
  }

  // Fall back to session cookie
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function generateApiKey(userId: string, name: string, scopes: string[] = ["read", "write"]) {
  const { randomBytes } = await import("crypto");
  const rawKey = `pix_${randomBytes(32).toString("hex")}`;
  const keyHash = hashKey(rawKey);

  await db.insert(apiKeys).values({
    userId,
    name,
    keyHash,
    scopes,
  });

  return rawKey; // Only returned once — never stored in plaintext
}
