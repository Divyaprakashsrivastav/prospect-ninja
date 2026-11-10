import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/targeting/:path*",
    "/prospects/:path*",
    "/approval/:path*",
    "/history/:path*",
    "/settings/:path*",
    "/login",
    "/register",
  ],
};
