import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { getApiUser } from "@/lib/session";
import { getProspect } from "@/modules/prospects/service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Params) {
  const user = await getApiUser();
  if (!user) {
    return jsonError("Unauthorized.", 401);
  }
  const { id } = await params;
  const prospect = await getProspect(user.id, id);
  if (!prospect) {
    return jsonError("Prospect not found.", 404);
  }
  return NextResponse.json({ prospect });
}
