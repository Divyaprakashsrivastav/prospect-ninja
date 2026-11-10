function optional(name: string): string | undefined {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    return undefined;
  }
  return value;
}

export const env = {
  databaseUrl: process.env.DATABASE_URL,
  authSecret: process.env.AUTH_SECRET,
  authUrl: optional("AUTH_URL") ?? "http://localhost:3000",
  openaiApiKey: optional("OPENAI_API_KEY"),
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
