import { NextResponse } from "next/server";
import { fromUnknownError, jsonError } from "@/lib/http";
import { getApiUser } from "@/lib/session";
import {
  generateLeadOutreach,
  listLeadOutreaches,
} from "@/modules/lead-outreach/service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Params) {
  const user = await getApiUser();
  if (!user) {
    return jsonError("Unauthorized.", 401);
  }
  try {
    const { id } = await params;
    const outreaches = await listLeadOutreaches(user.id, id);
    return NextResponse.json({ outreaches });
  } catch (error) {
    return fromUnknownError(error);
  }
}

export async function POST(request: Request, { params }: Params) {
  const user = await getApiUser();
  if (!user) {
    return jsonError("Unauthorized.", 401);
  }
  try {
    const { id } = await params;
    let body: unknown = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }
    const outreach = await generateLeadOutreach(user.id, id, body);
    return NextResponse.json({ outreach }, { status: 201 });
  } catch (error) {
    return fromUnknownError(error);
  }
}
