import { NextResponse } from "next/server";
import { fromUnknownError, jsonError } from "@/lib/http";
import { getApiUser } from "@/lib/session";
import {
  listConnections,
  selectProvider,
} from "@/modules/integrations/service";
import { z } from "zod";

export async function GET() {
  const user = await getApiUser();
  if (!user) {
    return jsonError("Unauthorized.", 401);
  }
  const connections = await listConnections(user.id);
  return NextResponse.json({ connections });
}

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) {
    return jsonError("Unauthorized.", 401);
  }
  try {
    const body = z
      .object({ provider: z.enum(["demo", "heyreach"]) })
      .parse(await request.json());
    const connections = await selectProvider(user.id, body.provider);
    return NextResponse.json({ connections });
  } catch (error) {
    return fromUnknownError(error);
  }
}
