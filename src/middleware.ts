import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { ensureAuthUrlEnv } from "@/lib/auth-env";

ensureAuthUrlEnv();

export default NextAuth(authConfig).auth;

export const config = {
  matcher: [
    "/dashboard",
    "/dashboard/:path*",
    "/targeting",
    "/targeting/:path*",
    "/prospects",
    "/prospects/:path*",
    "/studio",
    "/studio/:path*",
    "/inbox",
    "/inbox/:path*",
    "/leads",
    "/leads/:path*",
    "/outreach",
    "/outreach/:path*",
    "/approval",
    "/approval/:path*",
    "/analytics",
    "/analytics/:path*",
    "/history",
    "/history/:path*",
    "/settings",
    "/settings/:path*",
    "/connect-linkedin/:path*",
    "/login",
    "/register",
    "/api/v1/:path*",
  ],
};
