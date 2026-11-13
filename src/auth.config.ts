import type { NextAuthConfig } from "next-auth";

const protectedPrefixes = [
  "/dashboard",
  "/targeting",
  "/prospects",
  "/approval",
  "/history",
  "/settings",
];

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
      const isProtected = protectedPrefixes.some(
        (prefix) =>
          nextUrl.pathname === prefix ||
          nextUrl.pathname.startsWith(`${prefix}/`),
      );
      if (isProtected) {
        return isLoggedIn;
      }
      if (
        isLoggedIn &&
        (nextUrl.pathname === "/login" || nextUrl.pathname === "/register")
      ) {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }
      return true;
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
