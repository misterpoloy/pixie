import { NextRequest } from "next/server";
import { resolveUserId } from "@/lib/auth-helpers";
import { generateApiKey } from "@/lib/auth-helpers";
import { ok, err, unauthorized } from "@/lib/api-response";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1).max(100),
  scopes: z.array(z.string()).optional(),
});

export async function POST(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) return unauthorized();

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0].message);

  const { name, scopes } = parsed.data;
  const key = await generateApiKey(userId, name, scopes);

  return ok({ key }, 201);
}
