import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { getApiUser } from "@/lib/session";
import { listApprovalQueue, listHistory } from "@/modules/outreach/service";

export async function GET(request: Request) {
  const user = await getApiUser();
  if (!user) {
    return jsonError("Unauthorized.", 401);
  }
  const { searchParams } = new URL(request.url);
  const view = searchParams.get("view");
  const messages =
    view === "history"
      ? await listHistory(user.id)
      : await listApprovalQueue(user.id);
  return NextResponse.json({ messages });
}
