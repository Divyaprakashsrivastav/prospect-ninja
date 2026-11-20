import dns from "node:dns";
import { Prisma, PrismaClient } from "@prisma/client";

dns.setDefaultResultOrder("ipv4first");

/**
 * Next.js (`next dev` / `next start`) is one long-lived Node process, not a
 * serverless isolate-per-request. Prisma's `connection_limit` is this process's
 * pool size against PgBouncer, not the Supabase Postgres max.
 *
 * `connection_limit=1` is a serverless recipe. The dashboard runs layout auth,
 * page auth, eight stat counts, campaign list, and integrations in parallel, so
 * a 1-slot pool queues extra checkouts and hits P2024 (timeout 10 / limit 1).
 *
 * 5 is enough for that fan-out (queries queue in two short waves) without
 * opening a large number of pooler connections from this app.
 */
const APP_CONNECTION_LIMIT = 5;
const APP_POOL_TIMEOUT_SECONDS = 20;
const TX_CONNECTION_LIMIT = 2;

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaTx?: PrismaClient;
  prismaKey?: string;
  prismaTxKey?: string;
};

const log: Array<"error" | "warn"> =
  process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"];

function setParam(url: string, key: string, value: string): string {
  const pattern = new RegExp(`([?&])${key}=[^&]*`, "i");
  if (pattern.test(url)) {
    return url.replace(pattern, `$1${key}=${value}`);
  }
  return `${url}${url.includes("?") ? "&" : "?"}${key}=${value}`;
}

function postgresPort(url: string): string {
  const parsed = new URL(url.replace(/^postgresql:/i, "http:"));
  return parsed.port || "5432";
}

function withAppPoolParams(url: string): string {
  let next = setParam(url, "connect_timeout", "15");
  next = setParam(next, "connection_limit", String(APP_CONNECTION_LIMIT));
  next = setParam(next, "pool_timeout", String(APP_POOL_TIMEOUT_SECONDS));
  if (postgresPort(next) === "6543") {
    next = setParam(next, "pgbouncer", "true");
  }
  return next;
}

function withTxPoolParams(url: string): string {
  let next = setParam(url, "connect_timeout", "15");
  next = setParam(next, "connection_limit", String(TX_CONNECTION_LIMIT));
  next = setParam(next, "pool_timeout", String(APP_POOL_TIMEOUT_SECONDS));
  return next;
}

function databaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set.");
  }
  return withAppPoolParams(url);
}

function sessionUrl(): string {
  const url = process.env.DIRECT_URL;
  if (!url) {
    throw new Error(
      "DIRECT_URL is not set. Interactive transactions need the Supabase session pooler or direct connection (port 5432), not the transaction pooler (6543).",
    );
  }
  return withTxPoolParams(url);
}

function createClient(url: string): PrismaClient {
  return new PrismaClient({
    log,
    datasourceUrl: url,
  });
}

function getOrCreate(
  slot: "prisma" | "prismaTx",
  keySlot: "prismaKey" | "prismaTxKey",
  key: string,
  url: string,
): PrismaClient {
  if (globalForPrisma[slot] && globalForPrisma[keySlot] === key) {
    return globalForPrisma[slot];
  }
  const previous = globalForPrisma[slot];
  if (previous) {
    void previous.$disconnect();
  }
  const client = createClient(url);
  globalForPrisma[slot] = client;
  globalForPrisma[keySlot] = key;
  return client;
}

export const prisma = getOrCreate(
  "prisma",
  "prismaKey",
  `app:${postgresPort(databaseUrl())}:limit=${APP_CONNECTION_LIMIT}:timeout=${APP_POOL_TIMEOUT_SECONDS}`,
  databaseUrl(),
);

function getPrismaTx(): PrismaClient {
  const url = sessionUrl();
  return getOrCreate(
    "prismaTx",
    "prismaTxKey",
    `tx:${postgresPort(url)}:limit=${TX_CONNECTION_LIMIT}:timeout=${APP_POOL_TIMEOUT_SECONDS}`,
    url,
  );
}

export { isPrismaUnavailable } from "@/lib/db-errors";

export async function runInteractiveTransaction<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  options?: { maxWait?: number; timeout?: number },
): Promise<T> {
  const pooledPort = postgresPort(databaseUrl());
  const sessionPort = postgresPort(sessionUrl());
  if (sessionPort === "6543") {
    throw new Error(
      "DIRECT_URL points at the transaction-mode pooler (6543). Use the session pooler or direct connection on port 5432.",
    );
  }
  if (pooledPort === "6543" && sessionPort === "6543") {
    throw new Error("Both database URLs are transaction-mode poolers.");
  }

  return getPrismaTx().$transaction(fn, {
    maxWait: options?.maxWait ?? 10_000,
    timeout: options?.timeout ?? 30_000,
  });
}
