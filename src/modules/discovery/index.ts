import { env } from "@/lib/env";
import { demoProspectProvider } from "@/modules/discovery/demoProvider";
import { rocketReachProspectProvider } from "@/modules/discovery/rocketreachProvider";
import type { ProspectProvider } from "@/modules/discovery/types";

export async function getProspectProvider(
  userId: string,
): Promise<ProspectProvider> {
  void userId;
  if (env.rocketreachApiKey) {
    return rocketReachProspectProvider;
  }
  return demoProspectProvider;
}

export { demoProspectProvider, rocketReachProspectProvider };
export type { ProspectProvider } from "@/modules/discovery/types";
