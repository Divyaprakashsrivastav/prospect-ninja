import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export function fromUnknownError(error: unknown) {
  if (error instanceof ZodError) {
    return jsonError(error.issues.map((issue) => issue.message).join(" "), 400);
  }
  if (error instanceof Error) {
    return jsonError(error.message, 400);
  }
  return jsonError("Unexpected error.", 500);
}
