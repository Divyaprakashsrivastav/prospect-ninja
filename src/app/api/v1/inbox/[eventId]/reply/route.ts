import { NextResponse } from "next/server";
import { fromUnknownError, jsonError } from "@/lib/http";
import { getApiUser } from "@/lib/session";
import { sendInboxReply } from "@/modules/inbox/service";

type Params = { params: Promise<{ eventId: string }> };

export async function POST(request: Request, { params }: Params) {
  const user = await getApiUser();
  if (!user) {
    return jsonError("Unauthorized.", 401);
  }
  try {
    const { eventId } = await params;
    const body = (await request.json().catch(() => ({}))) as { text?: unknown };
    await sendInboxReply(user.id, eventId, typeof body.text === "string" ? body.text : "");
    return NextResponse.json({ sent: true });
  } catch (error) {
    return fromUnknownError(error);
  }
}
