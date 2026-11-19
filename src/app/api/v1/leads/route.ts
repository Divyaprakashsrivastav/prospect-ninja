import { NextResponse } from "next/server";
import { fromUnknownError, jsonError } from "@/lib/http";
import { getApiUser } from "@/lib/session";
import { createLead, listLeads } from "@/modules/leads/service";

export async function GET(request: Request) {
  const user = await getApiUser();
  if (!user) {
    return jsonError("Unauthorized.", 401);
  }
  try {
    const url = new URL(request.url);
    const listed = await listLeads(user.id, Object.fromEntries(url.searchParams));
    return NextResponse.json(listed);
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
    const lead = await createLead(user.id, await request.json());
    return NextResponse.json({ lead }, { status: 201 });
  } catch (error) {
    return fromUnknownError(error);
  }
}
