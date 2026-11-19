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
  unipileApiKey: optional("UNIPILE_API_KEY"),
  heyreachApiKey: optional("HEYREACH_API_KEY"),
  heyreachApiBaseUrl: optional("HEYREACH_API_BASE_URL"),
  rocketreachApiKey: optional("ROCKETREACH_API_KEY"),
  rocketreachApiBaseUrl:
    optional("ROCKETREACH_API_BASE_URL") ?? "https://api.rocketreach.co/api/v2",
  /**
   * "legacy" uses /person/search (Essentials, Pro, Ultimate plans).
   * "universal" uses /universal/person/search (Universal Credits plans).
   */
  rocketreachApiMode:
    optional("ROCKETREACH_API_MODE") === "universal" ? "universal" : "legacy",
};

export function requireDatabaseUrl(): string {
  if (!env.databaseUrl) {
    throw new Error("DATABASE_URL is not set.");
  }
  return env.databaseUrl;
}
