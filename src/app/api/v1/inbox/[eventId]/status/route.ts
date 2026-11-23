import { NextResponse } from "next/server";
import { fromUnknownError, jsonError } from "@/lib/http";
import { getApiUser } from "@/lib/session";
import { isInboxStatus } from "@/modules/inbox/constants";
import { setInboxStatus } from "@/modules/inbox/service";

type Params = { params: Promise<{ eventId: string }> };

/** Body: { status: "interested" | "not_now" | "meeting_booked" | null }. null clears it. */
export async function PUT(request: Request, { params }: Params) {
  const user = await getApiUser();
  if (!user) {
    return jsonError("Unauthorized.", 401);
  }
  const body = (await request.json().catch(() => ({}))) as { status?: unknown };
  if (body.status !== null && !isInboxStatus(body.status)) {
    return jsonError("Unknown status.", 400);
  }
  try {
    const { eventId } = await params;
    const status = await setInboxStatus(user.id, eventId, body.status);
    return NextResponse.json({ status });
  } catch (error) {
    return fromUnknownError(error);
  }
}
