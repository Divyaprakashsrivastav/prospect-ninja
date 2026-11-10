import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { jsonError } from "@/lib/http";
import { runDailyDiscovery } from "@/jobs/discoverCampaigns";

function isAuthorized(request: Request): boolean {
  if (!env.cronSecret) {
    return false;
  }
  const header = request.headers.get("authorization");
  return header === `Bearer ${env.cronSecret}`;
}

async function handle(request: Request) {
  if (!isAuthorized(request)) {
    return jsonError("Unauthorized.", 401);
  }
  const results = await runDailyDiscovery();
  return NextResponse.json({ ok: true, results });
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
