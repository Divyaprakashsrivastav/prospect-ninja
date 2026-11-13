"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn, signOut } from "@/auth";
import { registerUser } from "@/modules/auth/register";

function authConfigErrorMessage() {
  return "Server auth is misconfigured. In Vercel, set AUTH_SECRET (32+ characters) and AUTH_URL to this deployment URL.";
}

export async function loginAction(formData: FormData) {
  try {
    const result = await signIn("credentials", {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirect: false,
    });
    if (result?.error === "Configuration") {
      return { error: authConfigErrorMessage() };
    }
    if (result?.error) {
      return { error: "Invalid email or password." };
    }
  } catch (error) {
    if (error instanceof AuthError) {
      const kind = String((error as { type?: string }).type ?? "");
      if (kind === "Configuration" || /server configuration|AUTH_SECRET/i.test(error.message)) {
        return { error: authConfigErrorMessage() };
      }
      return { error: "Invalid email or password." };
    }
    throw error;
  }
  redirect("/dashboard");
}

export async function registerAction(formData: FormData) {
  try {
    await registerUser({
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not register.",
    };
  }
  return loginAction(formData);
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
