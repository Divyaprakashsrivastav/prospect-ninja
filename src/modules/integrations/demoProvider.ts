import { DEMO_PROSPECTS } from "@/modules/integrations/demoData";
import type {
  DiscoveredProspect,
  LinkedInProvider,
  SendResult,
} from "@/modules/integrations/types";
import type { Icp } from "@/modules/campaigns/schema";

function matchesIcp(prospect: DiscoveredProspect, icp: Icp): boolean {
  const haystack = [
    prospect.fullName,
    prospect.headline,
    prospect.companyName,
    prospect.location,
    prospect.industry,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const excluded = icp.exclusions.some((term) =>
    haystack.includes(term.toLowerCase()),
  );
  if (excluded) {
    return false;
  }

  const filters = [
    ...icp.jobTitles,
    ...icp.industries,
    ...icp.locations,
    ...icp.keywords,
  ].map((value) => value.toLowerCase());

  if (filters.length === 0) {
    return true;
  }

  return filters.some((term) => haystack.includes(term));
}

export const demoLinkedInProvider: LinkedInProvider = {
  id: "demo",
  label: "Demo provider (sample data only)",
  isConfigured: true,
  async discoverProspects({ icp, limit }) {
    const matched = DEMO_PROSPECTS.filter((prospect) =>
      matchesIcp(prospect, icp),
    );
    const pool = matched.length > 0 ? matched : DEMO_PROSPECTS;
    return pool.slice(0, Math.max(limit, 1) * 3);
  },
  async sendMessage(): Promise<SendResult> {
    return {
      ok: true,
      simulated: true,
      providerMessageId: `demo-${Date.now()}`,
    };
  },
  getStatus() {
    return {
      provider: "demo",
      label: this.label,
      configured: true,
    };
  },
};
