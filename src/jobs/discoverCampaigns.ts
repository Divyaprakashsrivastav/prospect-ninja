import { discoverAllActiveCampaigns } from "@/modules/prospects/service";

export async function runDailyDiscovery() {
  return discoverAllActiveCampaigns();
}
