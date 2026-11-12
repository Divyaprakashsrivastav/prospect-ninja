import { NextResponse } from "next/server";
import { fromUnknownError, jsonError } from "@/lib/http";
import { getApiUser } from "@/lib/session";
import { getDiscoveryQuota } from "@/modules/prospects/service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Params) {
  const user = await getApiUser();
  if (!user) {
    return jsonError("Unauthorized.", 401);
  }
  try {
    const { id } = await params;
    const quota = await getDiscoveryQuota(user.id, id);
    return NextResponse.json({ quota });
  } catch (error) {
    return fromUnknownError(error);
  }
}
