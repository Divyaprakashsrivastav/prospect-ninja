import type { NextAuthConfig } from "next-auth";
import { ensureAuthUrlEnv } from "@/lib/auth-env";

ensureAuthUrlEnv();

const protectedPrefixes = [
  "/dashboard",
  "/targeting",
  "/prospects",
  "/studio",
  "/approval",
  "/analytics",
  "/history",
  "/settings",
];

function isProtectedPath(pathname: string): boolean {
  return protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
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
  },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = Boolean(auth?.user);
      const pathname = nextUrl.pathname;

      if (isProtectedPath(pathname) && !isLoggedIn) {
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
