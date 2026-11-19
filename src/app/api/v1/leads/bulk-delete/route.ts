import { NextResponse } from "next/server";
import { fromUnknownError, jsonError } from "@/lib/http";
import { getApiUser } from "@/lib/session";
import { bulkDeleteLeads } from "@/modules/leads/service";

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) {
    return jsonError("Unauthorized.", 401);
  }
  try {
    const result = await bulkDeleteLeads(user.id, await request.json());
    return NextResponse.json({ result });
  } catch (error) {
    return fromUnknownError(error);
  }
}
