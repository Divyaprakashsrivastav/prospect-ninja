import { NextResponse } from "next/server";
import { z } from "zod";
import { fromUnknownError, jsonError } from "@/lib/http";
import { getApiUser } from "@/lib/session";
import { createLinkUrl } from "@/modules/integrations/unipileAuth";

const bodySchema = z.object({
  type: z.enum(["create", "reconnect"]).default("create"),
});

/** Returns a one-time Unipile hosted auth URL for the signed-in user. */
export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) {
    return jsonError("Unauthorized.", 401);
  }
  try {
    const raw = await request.json().catch(() => ({}));
    const { type } = bodySchema.parse(raw);
    const url = await createLinkUrl(user.id, type);
    return NextResponse.json({ url });
  } catch (error) {
    return fromUnknownError(error);
  }
}
