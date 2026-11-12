import { NextResponse } from "next/server";
import { fromUnknownError, jsonError } from "@/lib/http";
import { getApiUser } from "@/lib/session";
import {
  campaignInputSchema,
  campaignStatusSchema,
} from "@/modules/campaigns/schema";
import {
  deleteCampaign,
  getCampaign,
  setCampaignActive,
  updateCampaign,
} from "@/modules/campaigns/service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Params) {
  const user = await getApiUser();
  if (!user) {
    return jsonError("Unauthorized.", 401);
  }
  const { id } = await params;
  const campaign = await getCampaign(user.id, id);
  if (!campaign) {
    return jsonError("Campaign not found.", 404);
  }
  return NextResponse.json({ campaign });
}

export async function PUT(request: Request, { params }: Params) {
  const user = await getApiUser();
  if (!user) {
    return jsonError("Unauthorized.", 401);
  }
  try {
    const { id } = await params;
    const body = campaignInputSchema.parse(await request.json());
    const campaign = await updateCampaign(user.id, id, body);
    return NextResponse.json({ campaign });
  } catch (error) {
    return fromUnknownError(error);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  const user = await getApiUser();
  if (!user) {
    return jsonError("Unauthorized.", 401);
  }
  try {
    const { id } = await params;
    const body = campaignStatusSchema.parse(await request.json());
    const campaign = await setCampaignActive(user.id, id, body.isActive);
    return NextResponse.json({ campaign });
  } catch (error) {
    return fromUnknownError(error);
  }
}

export async function DELETE(_: Request, { params }: Params) {
  const user = await getApiUser();
  if (!user) {
    return jsonError("Unauthorized.", 401);
  }
  try {
    const { id } = await params;
    await deleteCampaign(user.id, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return fromUnknownError(error);
  }
}
