import { env } from "@/lib/env";
import { prisma } from "@/lib/db";
import { demoProspectProvider } from "@/modules/discovery/demoProvider";
import { externalProspectProvider } from "@/modules/discovery/externalProvider";
import type { ProspectProvider } from "@/modules/discovery/types";

export async function getProspectProvider(
  userId: string,
): Promise<ProspectProvider> {
  const heyreach = await prisma.integrationConnection.findUnique({
    where: { userId_provider: { userId, provider: "heyreach" } },
  });
  if (heyreach?.status === "connected" && env.heyreachApiKey) {
    return externalProspectProvider;
  }
  return demoProspectProvider;
}

export {
  demoProspectProvider,
  externalProspectProvider,
};
export type { ProspectProvider } from "@/modules/discovery/types";
