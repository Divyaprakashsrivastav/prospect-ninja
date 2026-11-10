import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { getApiUser } from "@/lib/session";
import { getDashboardStats } from "@/modules/analytics/service";

export async function GET() {
  const user = await getApiUser();
  if (!user) {
    return jsonError("Unauthorized.", 401);
  }
  const stats = await getDashboardStats(user.id);
  return NextResponse.json({ stats });
}
