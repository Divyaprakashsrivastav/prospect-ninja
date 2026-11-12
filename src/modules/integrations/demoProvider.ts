import { demoProspectProvider } from "@/modules/discovery/demoProvider";
import { criteriaFromIcp } from "@/modules/discovery/types";
import type {
  DiscoveredProspect,
  LinkedInProvider,
  SendResult,
} from "@/modules/integrations/types";

export const demoLinkedInProvider: LinkedInProvider = {
  id: "demo",
  label: "Demo provider (sample data only)",
  isConfigured: true,
  async discoverProspects({ icp, limit }) {
    const search = await demoProspectProvider.searchProspects(
      criteriaFromIcp(icp, Math.max(limit, 1) * 3),
    );
    return search.records.map(
      (record): DiscoveredProspect => ({
        provider: "demo",
        externalId: record.providerProspectId,
        linkedinUrl: record.profileUrl,
        fullName: `${record.firstName} ${record.lastName}`,
        headline: record.jobTitle,
        companyName: record.company,
        location: record.location,
        industry: record.industry,
        rawProfile: {
          labelled: "DEMO DATA",
          summary: record.professionalSummary,
        },
      }),
    );
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
