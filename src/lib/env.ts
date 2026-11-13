function optional(name: string): string | undefined {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    return undefined;
  }
  return value;
}

function authUrl(): string {
  const value = optional("AUTH_URL");
  if (value) {
    return value;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

export const env = {
  databaseUrl: process.env.DATABASE_URL,
  authSecret: process.env.AUTH_SECRET,
  authUrl: authUrl(),
  openaiApiKey: optional("OPENAI_API_KEY"),
  openaiModel: optional("OPENAI_MODEL") ?? "gpt-4o-mini",
  aiProvider: optional("AI_PROVIDER") ?? "auto",
  cronSecret: optional("CRON_SECRET"),
  heyreachApiKey: optional("HEYREACH_API_KEY"),
  heyreachApiBaseUrl: optional("HEYREACH_API_BASE_URL"),
};

export function requireDatabaseUrl(): string {
  if (!env.databaseUrl) {
    throw new Error("DATABASE_URL is not set.");
  }
  return env.databaseUrl;
}
