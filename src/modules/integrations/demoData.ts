import { DEMO_CATALOG } from "@/modules/discovery/demoCatalog";
import type { DiscoveredProspect } from "@/modules/integrations/types";

export const DEMO_PROSPECTS: DiscoveredProspect[] = DEMO_CATALOG.map(
  (record) => ({
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
