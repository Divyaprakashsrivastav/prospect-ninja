import { NextResponse } from "next/server";
import { fromUnknownError, jsonError } from "@/lib/http";
import { getApiUser } from "@/lib/session";
import { generateDraftForProspect, getMessage } from "@/modules/outreach/service";

type Params = { params: Promise<{ id: string }> };

export async function POST(_: Request, { params }: Params) {
  const user = await getApiUser();
  if (!user) {
    return jsonError("Unauthorized.", 401);
  }
  try {
    const { id } = await params;
    const existing = await getMessage(user.id, id);
    if (!existing) {
      return jsonError("Message not found.", 404);
    }
    const message = await generateDraftForProspect(user.id, existing.prospectId);
    return NextResponse.json({ message });
  } catch (error) {
    return fromUnknownError(error);
  }
}
