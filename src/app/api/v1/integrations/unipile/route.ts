import { NextResponse } from "next/server";
import { fromUnknownError, jsonError } from "@/lib/http";
import { getApiUser } from "@/lib/session";
import { getLinkedInConnection } from "@/modules/integrations/service";
import { disconnectUnipile } from "@/modules/integrations/unipileAuth";

/** The user's LinkedIn (Unipile) link status. Polled by /connect-linkedin after the redirect. */
export async function GET() {
  const user = await getApiUser();
  if (!user) {
    return jsonError("Unauthorized.", 401);
  }
  return NextResponse.json({ connection: await getLinkedInConnection(user.id) });
}

export async function DELETE() {
  const user = await getApiUser();
  if (!user) {
    return jsonError("Unauthorized.", 401);
  }
  try {
    await disconnectUnipile(user.id);
    return NextResponse.json({ connection: await getLinkedInConnection(user.id) });
  } catch (error) {
    return fromUnknownError(error);
  }
}
