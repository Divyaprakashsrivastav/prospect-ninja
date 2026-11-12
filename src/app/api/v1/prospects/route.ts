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
  const result = await listProspects(user.id, {
    campaignId: searchParams.get("campaignId") ?? undefined,
    q: searchParams.get("q") ?? undefined,
    jobTitle: searchParams.get("jobTitle") ?? undefined,
    industry: searchParams.get("industry") ?? undefined,
    location: searchParams.get("location") ?? undefined,
    page: searchParams.get("page")
      ? Number(searchParams.get("page"))
      : undefined,
  });
  return NextResponse.json(result);
}
