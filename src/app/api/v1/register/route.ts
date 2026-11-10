import { NextResponse } from "next/server";
import { fromUnknownError } from "@/lib/http";
import { consumeRateLimit } from "@/lib/rateLimit";
import { registerUser } from "@/modules/auth/register";

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") ?? "local";
    if (!consumeRateLimit(`register:${ip}`, 10, 60 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many attempts." }, { status: 429 });
    }
    const body = await request.json();
    const user = await registerUser(body);
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    return fromUnknownError(error);
  }
}
