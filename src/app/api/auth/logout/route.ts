import { NextRequest, NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { ensureAuthUrlEnv } from "@/lib/auth-env";

ensureAuthUrlEnv();

const { signOut } = NextAuth(authConfig);

const SESSION_COOKIES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "authjs.callback-url",
  "__Secure-authjs.callback-url",
  "authjs.csrf-token",
  "__Host-authjs.csrf-token",
];

function clearAuthCookies(response: NextResponse) {
  for (const name of SESSION_COOKIES) {
    response.cookies.set(name, "", {
      expires: new Date(0),
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: name.startsWith("__Secure-") || name.startsWith("__Host-"),
    });
  }
}

async function clearSession(request: NextRequest) {
  try {
    await signOut({ redirect: false });
  } catch {
    // Cookie clearing below still signs the browser out.
  }

  const response = NextResponse.redirect(new URL("/login", request.url), 303);
  clearAuthCookies(response);
  return response;
}

export async function GET(request: NextRequest) {
  return clearSession(request);
}

export async function POST(request: NextRequest) {
  return clearSession(request);
}
