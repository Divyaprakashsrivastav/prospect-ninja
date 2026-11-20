import { NextResponse } from "next/server";
import { fromUnknownError, jsonError } from "@/lib/http";
import { getApiUser } from "@/lib/session";
import { getLeadStats } from "@/modules/leads/service";

export async function GET() {
  const user = await getApiUser();
  if (!user) {
    return jsonError("Unauthorized.", 401);
  }
  try {
    const stats = await getLeadStats(user.id);
    return NextResponse.json({ stats });
  } catch (error) {
    return fromUnknownError(error);
  }
}
