import dns from "node:dns";
import { Prisma, PrismaClient } from "@prisma/client";

dns.setDefaultResultOrder("ipv4first");

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaTx?: PrismaClient;
};

const log: Array<"error" | "warn"> =
  process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"];

function withConnectTimeout(url: string): string {
  if (/[?&]connect_timeout=/i.test(url)) {
    return url;
  }
  return `${url}${url.includes("?") ? "&" : "?"}connect_timeout=15`;
}

function databaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set.");
  }
  return withConnectTimeout(url);
}

function sessionUrl(): string {
  const url = process.env.DIRECT_URL;
  if (!url) {
    throw new Error(
      "DIRECT_URL is not set. Interactive transactions need the Supabase session pooler or direct connection (port 5432), not the transaction pooler (6543).",
    );
  }
  return withConnectTimeout(url);
}

function postgresPort(url: string): string {
  const parsed = new URL(url.replace(/^postgresql:/i, "http:"));
  return parsed.port || "5432";
}

function createClient(url: string): PrismaClient {
  return new PrismaClient({
    log,
    datasourceUrl: url,
  });
}

export const prisma = globalForPrisma.prisma ?? createClient(databaseUrl());
globalForPrisma.prisma = prisma;

function getPrismaTx(): PrismaClient {
  if (!globalForPrisma.prismaTx) {
    globalForPrisma.prismaTx = createClient(sessionUrl());
  }
  return globalForPrisma.prismaTx;
}

function isUnreachable(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P1001"
  );
}

export async function withDatabaseFallback<T>(
  query: (client: PrismaClient) => Promise<T>,
): Promise<T> {
  try {
    return await query(prisma);
  } catch (error) {
    if (!isUnreachable(error)) {
      throw error;
    }
    return query(getPrismaTx());
  }
}

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
