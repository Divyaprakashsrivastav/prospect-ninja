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
    "/approval",
    "/approval/:path*",
    "/history",
    "/history/:path*",
    "/settings",
    "/settings/:path*",
    "/login",
    "/register",
  ],
};
