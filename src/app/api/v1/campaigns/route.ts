import { NextResponse } from "next/server";
import { fromUnknownError, jsonError } from "@/lib/http";
import { getApiUser } from "@/lib/session";
import {
  createCampaign,
  listCampaigns,
} from "@/modules/campaigns/service";
import { campaignInputSchema } from "@/modules/campaigns/schema";

export async function GET() {
  const user = await getApiUser();
  if (!user) {
    return jsonError("Unauthorized.", 401);
  }
  const campaigns = await listCampaigns(user.id);
  return NextResponse.json({ campaigns });
}

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) {
    return jsonError("Unauthorized.", 401);
  }
  try {
    const body = campaignInputSchema.parse(await request.json());
    const campaign = await createCampaign(user.id, body);
    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    return fromUnknownError(error);
  }
}
