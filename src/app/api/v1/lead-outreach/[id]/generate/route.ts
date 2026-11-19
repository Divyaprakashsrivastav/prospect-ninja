import { NextResponse } from "next/server";
import { fromUnknownError, jsonError } from "@/lib/http";
import { getApiUser } from "@/lib/session";
import {
  generateLeadOutreach,
  getLeadOutreach,
} from "@/modules/lead-outreach/service";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const user = await getApiUser();
  if (!user) {
    return jsonError("Unauthorized.", 401);
  }
  try {
    const { id } = await params;
    const existing = await getLeadOutreach(user.id, id);
    if (!existing) {
      return jsonError("Outreach not found.", 404);
    }
    let body: Record<string, unknown> = {};
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      body = {};
    }
    const outreach = await generateLeadOutreach(user.id, existing.leadId, {
      messageType: existing.messageType,
      campaignContext:
        typeof body.campaignContext === "string"
          ? body.campaignContext
          : existing.campaignContext,
      replaceExisting: body.replaceExisting === true,
    });
    return NextResponse.json({ outreach });
  } catch (error) {
    return fromUnknownError(error);
  }
}
