import { NextResponse } from "next/server";
import { fromUnknownError, jsonError } from "@/lib/http";
import { getApiUser } from "@/lib/session";
import {
  bulkGenerateLeadOutreach,
  getLeadOutreachStats,
  listWorkspaceOutreaches,
} from "@/modules/lead-outreach/service";

export async function GET(request: Request) {
  const user = await getApiUser();
  if (!user) {
    return jsonError("Unauthorized.", 401);
  }
  try {
    const url = new URL(request.url);
    const [listed, stats] = await Promise.all([
      listWorkspaceOutreaches(user.id, {
        status: url.searchParams.get("status") ?? undefined,
        page: url.searchParams.get("page")
          ? Number(url.searchParams.get("page"))
          : 1,
      }),
      getLeadOutreachStats(user.id),
    ]);
    return NextResponse.json({ ...listed, stats });
  } catch (error) {
    return fromUnknownError(error);
  }
}

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) {
    return jsonError("Unauthorized.", 401);
  }
  try {
    const result = await bulkGenerateLeadOutreach(user.id, await request.json());
    return NextResponse.json({ result });
  } catch (error) {
    return fromUnknownError(error);
  }
}
