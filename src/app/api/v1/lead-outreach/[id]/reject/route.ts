import { NextResponse } from "next/server";
import { fromUnknownError, jsonError } from "@/lib/http";
import { getApiUser } from "@/lib/session";
import { rejectLeadOutreach } from "@/modules/lead-outreach/service";

type Params = { params: Promise<{ id: string }> };

export async function POST(_: Request, { params }: Params) {
  const user = await getApiUser();
  if (!user) {
    return jsonError("Unauthorized.", 401);
  }
  try {
    const { id } = await params;
    const outreach = await rejectLeadOutreach(user.id, id);
    return NextResponse.json({ outreach });
  } catch (error) {
    return fromUnknownError(error);
  }
}
