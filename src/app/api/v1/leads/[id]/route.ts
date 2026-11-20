import { NextResponse } from "next/server";
import { fromUnknownError, jsonError } from "@/lib/http";
import { getApiUser } from "@/lib/session";
import {
  deleteLead,
  getLead,
  updateLead,
  updateLeadStatus,
} from "@/modules/leads/service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Params) {
  const user = await getApiUser();
  if (!user) {
    return jsonError("Unauthorized.", 401);
  }
  const { id } = await params;
  const lead = await getLead(user.id, id);
  if (!lead) {
    return jsonError("Lead not found.", 404);
  }
  return NextResponse.json({ lead });
}

export async function PUT(request: Request, { params }: Params) {
  const user = await getApiUser();
  if (!user) {
    return jsonError("Unauthorized.", 401);
  }
  try {
    const { id } = await params;
    const lead = await updateLead(user.id, id, await request.json());
    return NextResponse.json({ lead });
  } catch (error) {
    return fromUnknownError(error);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  const user = await getApiUser();
  if (!user) {
    return jsonError("Unauthorized.", 401);
  }
  try {
    const { id } = await params;
    const body = await request.json();
    const lead =
      body && typeof body === "object" && "status" in body && Object.keys(body).length === 1
        ? await updateLeadStatus(user.id, id, body)
        : await updateLead(user.id, id, body);
    return NextResponse.json({ lead });
  } catch (error) {
    return fromUnknownError(error);
  }
}

export async function DELETE(_: Request, { params }: Params) {
  const user = await getApiUser();
  if (!user) {
    return jsonError("Unauthorized.", 401);
  }
  try {
    const { id } = await params;
    await deleteLead(user.id, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return fromUnknownError(error);
  }
}
