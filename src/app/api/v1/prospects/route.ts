import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { getApiUser } from "@/lib/session";
import { listProspects } from "@/modules/prospects/service";

export async function GET(request: Request) {
  const user = await getApiUser();
  if (!user) {
    return jsonError("Unauthorized.", 401);
  }
  const { searchParams } = new URL(request.url);
  const campaignId = searchParams.get("campaignId") ?? undefined;
  const prospects = await listProspects(user.id, campaignId);
  return NextResponse.json({ prospects });
}
