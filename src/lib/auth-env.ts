function isLocalhostUrl(value: string): boolean {
  try {
    const host = new URL(value).hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
  } catch {
    return false;
  }
}

/**
 * Auth.js prefers AUTH_URL / NEXTAUTH_URL over the request Host header.
 * A leftover local AUTH_URL on Vercel makes every auth redirect point at localhost.
 * Correct that before NextAuth initializes (middleware, routes, and Node server).
 */
export function ensureAuthUrlEnv(): void {
  const onVercel = Boolean(process.env.VERCEL);
  if (!onVercel) {
    return;
  }

  const configured = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL;
  const vercelHost = process.env.VERCEL_URL?.replace(/\/$/, "");
  const needsCorrection = !configured || isLocalhostUrl(configured);

  if (!needsCorrection) {
    return;
  }

  if (process.env.AUTH_URL && isLocalhostUrl(process.env.AUTH_URL)) {
    delete process.env.AUTH_URL;
  }
  if (process.env.NEXTAUTH_URL && isLocalhostUrl(process.env.NEXTAUTH_URL)) {
    delete process.env.NEXTAUTH_URL;
  }

  if (vercelHost) {
    process.env.AUTH_URL = `https://${vercelHost}`;
  }
}

export function resolveAuthUrl(): string {
  ensureAuthUrlEnv();
  const configured = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL;
  if (configured && !isLocalhostUrl(configured)) {
    return configured.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  }
  if (configured) {
    return configured.replace(/\/$/, "");
  }
  return "http://localhost:3000";
}
