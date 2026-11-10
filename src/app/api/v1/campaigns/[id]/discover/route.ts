import { NextResponse } from "next/server";
import { fromUnknownError, jsonError } from "@/lib/http";
import { getApiUser } from "@/lib/session";
import { discoverForCampaign } from "@/modules/prospects/service";

type Params = { params: Promise<{ id: string }> };

export async function POST(_: Request, { params }: Params) {
  const user = await getApiUser();
  if (!user) {
    return jsonError("Unauthorized.", 401);
  }
  try {
    const { id } = await params;
    const result = await discoverForCampaign(user.id, id);
    return NextResponse.json({ result });
  } catch (error) {
    return fromUnknownError(error);
  }
}
