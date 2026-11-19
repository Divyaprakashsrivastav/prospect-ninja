import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { demoLinkedInProvider } from "@/modules/integrations/demoProvider";
import { heyReachProvider } from "@/modules/integrations/heyreachProvider";
import type { LinkedInProvider } from "@/modules/integrations/types";
import {
  UNIPILE_PROVIDER,
  UNIPILE_STATUS,
} from "@/modules/integrations/unipileAuth";
import { isUnipileConfigured } from "@/modules/integrations/unipileClient";
import { createUnipileProvider } from "@/modules/integrations/unipileProvider";
import { z } from "zod";

const providerIdSchema = z.enum(["demo", "heyreach"]);

export async function ensureDefaultConnection(userId: string) {
  await prisma.integrationConnection.upsert({
    where: { userId_provider: { userId, provider: "demo" } },
    update: { status: "connected" },
    create: { userId, provider: "demo", status: "connected" },
  });
  await prisma.integrationConnection.upsert({
    where: { userId_provider: { userId, provider: "heyreach" } },
    update: {
      status: env.heyreachApiKey ? "connected" : "not_configured",
    },
    create: {
      userId,
      provider: "heyreach",
      status: env.heyreachApiKey ? "connected" : "not_configured",
    },
  });
}

export async function listConnections(userId: string) {
  await ensureDefaultConnection(userId);
  const rows = await prisma.integrationConnection.findMany({
    where: { userId },
    orderBy: { provider: "asc" },
  });
  return rows.map((row) => ({
    ...row,
    label:
      row.provider === UNIPILE_PROVIDER
        ? "LinkedIn via Unipile"
        : row.provider === "demo"
          ? demoLinkedInProvider.label
          : heyReachProvider.label,
    liveSendAllowed:
      row.provider === UNIPILE_PROVIDER
        ? isUnipileLive(row)
        : row.provider === "heyreach" && Boolean(env.heyreachApiKey),
  }));
}

function isUnipileLive(row: {
  status: string;
  externalAccountId: string | null;
}): boolean {
  return (
    row.status === UNIPILE_STATUS.connected &&
    Boolean(row.externalAccountId) &&
    isUnipileConfigured()
  );
}

/** The user's Unipile row, or null when they never started linking. */
export async function getLinkedInConnection(userId: string) {
  const row = await prisma.integrationConnection.findUnique({
    where: { userId_provider: { userId, provider: UNIPILE_PROVIDER } },
  });
  return {
    configured: isUnipileConfigured(),
    status: row?.status ?? UNIPILE_STATUS.notConnected,
    displayName: row?.displayName ?? null,
    connectedAt: row?.connectedAt ?? null,
    lastError: row?.lastError ?? null,
    live: row ? isUnipileLive(row) : false,
  };
}

export async function getActiveProvider(userId: string): Promise<LinkedInProvider> {
  // A linked LinkedIn account always wins: users send as themselves.
  const unipile = await prisma.integrationConnection.findUnique({
    where: { userId_provider: { userId, provider: UNIPILE_PROVIDER } },
  });
  if (unipile?.externalAccountId && isUnipileLive(unipile)) {
    return createUnipileProvider(unipile.externalAccountId);
  }

  await ensureDefaultConnection(userId);
  const heyreach = await prisma.integrationConnection.findUnique({
    where: { userId_provider: { userId, provider: "heyreach" } },
  });
  if (heyreach?.status === "connected" && env.heyreachApiKey) {
    return heyReachProvider;
  }
  return demoLinkedInProvider;
}

export async function selectProvider(
  userId: string,
  provider: "demo" | "heyreach",
) {
  const parsed = providerIdSchema.parse(provider);
  await ensureDefaultConnection(userId);
  if (parsed === "heyreach" && !env.heyreachApiKey) {
    throw new Error(
      "HeyReach credentials are not available. Keep using the demo provider until an official API key is supplied.",
    );
  }
  await prisma.integrationConnection.updateMany({
    where: { userId, provider: "demo" },
    data: { status: parsed === "demo" ? "connected" : "standby" },
  });
  await prisma.integrationConnection.updateMany({
    where: { userId, provider: "heyreach" },
    data: {
      status: parsed === "heyreach" ? "connected" : "not_configured",
    },
  });
  return listConnections(userId);
}
