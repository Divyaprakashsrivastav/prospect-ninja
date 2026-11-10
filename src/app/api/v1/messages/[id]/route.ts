import { NextResponse } from "next/server";
import { fromUnknownError, jsonError } from "@/lib/http";
import { getApiUser } from "@/lib/session";
import { editMessage, getMessage } from "@/modules/outreach/service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Params) {
  const user = await getApiUser();
  if (!user) {
    return jsonError("Unauthorized.", 401);
  }
  const { id } = await params;
  const message = await getMessage(user.id, id);
  if (!message) {
    return jsonError("Message not found.", 404);
  }
  return NextResponse.json({ message });
}

export async function PATCH(request: Request, { params }: Params) {
  const user = await getApiUser();
  if (!user) {
    return jsonError("Unauthorized.", 401);
  }
  try {
    const { id } = await params;
    const { body } = (await request.json()) as { body?: string };
    const message = await editMessage(user.id, id, body ?? "");
    return NextResponse.json({ message });
  } catch (error) {
    return fromUnknownError(error);
  }
}
