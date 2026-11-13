import { Prisma, PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaTx?: PrismaClient;
};

const log: Array<"error" | "warn"> =
  process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"];

function databaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set.");
  }
  return url;
}

function sessionUrl(): string {
  const url = process.env.DIRECT_URL;
  if (!url) {
    throw new Error(
      "DIRECT_URL is not set. Interactive transactions need the Supabase session pooler or direct connection (port 5432), not the transaction pooler (6543).",
    );
  }
  return url;
}

function postgresPort(url: string): string {
  const parsed = new URL(url.replace(/^postgresql:/i, "http:"));
  return parsed.port || "5432";
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log,
    datasourceUrl: databaseUrl(),
  });

/** Session-mode client. PgBouncer transaction mode cannot hold Prisma interactive transactions. */
export const prismaTx =
  globalForPrisma.prismaTx ??
  new PrismaClient({
    log,
    datasourceUrl: sessionUrl(),
  });

globalForPrisma.prisma = prisma;
globalForPrisma.prismaTx = prismaTx;

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

  return prismaTx.$transaction(fn, {
    maxWait: options?.maxWait ?? 10_000,
    timeout: options?.timeout ?? 30_000,
  });
}
