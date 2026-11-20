import { NextResponse } from "next/server";
import { fromUnknownError, jsonError } from "@/lib/http";
import { getApiUser } from "@/lib/session";
import { editLeadOutreach, getLeadOutreach } from "@/modules/lead-outreach/service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Params) {
  const user = await getApiUser();
  if (!user) {
    return jsonError("Unauthorized.", 401);
  }
  const { id } = await params;
  const outreach = await getLeadOutreach(user.id, id);
  if (!outreach) {
    return jsonError("Outreach not found.", 404);
  }
  return NextResponse.json({ outreach });
}

export async function PATCH(request: Request, { params }: Params) {
  const user = await getApiUser();
  if (!user) {
    return jsonError("Unauthorized.", 401);
  }
  try {
    const { id } = await params;
    const outreach = await editLeadOutreach(user.id, id, await request.json());
    return NextResponse.json({ outreach });
  } catch (error) {
    return fromUnknownError(error);
  }
}
