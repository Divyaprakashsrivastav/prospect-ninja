import { LoginForm } from "@/components/LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const configError =
    params.error === "Configuration"
      ? "Server auth is misconfigured. In Vercel, set AUTH_SECRET (32+ characters) and AUTH_URL to this deployment URL."
      : undefined;
  return <LoginForm configError={configError} />;
}
