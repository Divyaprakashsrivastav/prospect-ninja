import dns from "node:dns";
import { Prisma, PrismaClient } from "@prisma/client";

dns.setDefaultResultOrder("ipv4first");

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaTx?: PrismaClient;
};

const log: Array<"error" | "warn"> =
  process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"];

function appendParam(url: string, key: string, value: string): string {
  if (new RegExp(`[?&]${key}=`, "i").test(url)) {
    return url;
  }
  return `${url}${url.includes("?") ? "&" : "?"}${key}=${value}`;
}

function withPoolParams(url: string): string {
  return appendParam(
    appendParam(appendParam(url, "connect_timeout", "15"), "connection_limit", "1"),
    "pool_timeout",
    "10",
  );
}

function databaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set.");
  }
  return withPoolParams(url);
}

function sessionUrl(): string {
  const url = process.env.DIRECT_URL;
  if (!url) {
    throw new Error(
      "DIRECT_URL is not set. Interactive transactions need the Supabase session pooler or direct connection (port 5432), not the transaction pooler (6543).",
    );
  }
  return withPoolParams(url);
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

export function isPrismaUnavailable(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  const code =
    "code" in error
      ? String((error as { code?: string }).code ?? "")
      : "errorCode" in error
        ? String((error as { errorCode?: string }).errorCode ?? "")
        : "";
  const name = "name" in error ? String((error as { name?: string }).name) : "";
  const message =
    "message" in error ? String((error as { message?: string }).message) : "";
  return (
    code === "P1001" ||
    code === "P1017" ||
    code === "P2024" ||
    name === "PrismaClientInitializationError" ||
    /can't reach database server|timed out fetching a new connection|connection pool/i.test(
      message,
    )
  );
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
