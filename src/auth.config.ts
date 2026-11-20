import type { NextAuthConfig } from "next-auth";
import { ensureAuthUrlEnv } from "@/lib/auth-env";

ensureAuthUrlEnv();

const protectedPagePrefixes = [
  "/dashboard",
  "/targeting",
  "/prospects",
  "/studio",
  "/leads",
  "/outreach",
  "/approval",
  "/analytics",
  "/history",
  "/settings",
  "/connect-linkedin",
];

/** Public under /api/v1 — everything else under /api/v1 requires a session. */
const publicApiExact = new Set(["/api/v1/register"]);

function isProtectedPage(pathname: string): boolean {
  return protectedPagePrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function isProtectedApi(pathname: string): boolean {
  if (!pathname.startsWith("/api/v1")) {
    return false;
  }
  return !publicApiExact.has(pathname);
}

function hasSessionUser(auth: { user?: { id?: string | null } } | null): boolean {
  const id = auth?.user?.id;
  return typeof id === "string" && id.length > 0;
}

export const authConfig = {
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  trustHost: true,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    // 7 days — expired sessions must sign in again.
    maxAge: 7 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = hasSessionUser(auth);
      const pathname = nextUrl.pathname;

      if (isProtectedApi(pathname) && !isLoggedIn) {
        return Response.json({ error: "Unauthorized." }, { status: 401 });
      }

      if (isProtectedPage(pathname) && !isLoggedIn) {
        const loginUrl = new URL("/login", nextUrl.origin);
        loginUrl.searchParams.set(
          "callbackUrl",
          `${nextUrl.pathname}${nextUrl.search}`,
        );
        return Response.redirect(loginUrl);
      }

      if (
        isLoggedIn &&
        (pathname === "/login" || pathname === "/register")
      ) {
        return Response.redirect(new URL("/dashboard", nextUrl.origin));
      }

      return true;
    },
    redirect({ url, baseUrl }) {
      try {
        const base = new URL(baseUrl);
        const target = new URL(url, base);
        if (target.origin === base.origin) {
          return target.toString();
        }
        if (url.startsWith("/") && !url.startsWith("//")) {
          return new URL(url, base).toString();
        }
      } catch {
        // fall through
      }
      return baseUrl;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = typeof token.id === "string" ? token.id : "";
        session.user.email = session.user.email ?? "";
        session.user.name = session.user.name ?? "";
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
