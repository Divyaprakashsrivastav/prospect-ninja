import { LoginForm } from "@/components/LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  const params = await searchParams;
  const configError =
    params.error === "Configuration"
      ? "Server auth is misconfigured. In Vercel, set AUTH_SECRET (32+ characters) and AUTH_URL to this deployment URL."
      : undefined;
  const callbackUrl =
    params.callbackUrl &&
    params.callbackUrl.startsWith("/") &&
    !params.callbackUrl.startsWith("//")
      ? params.callbackUrl
      : undefined;
  return <LoginForm configError={configError} callbackUrl={callbackUrl} />;
}
