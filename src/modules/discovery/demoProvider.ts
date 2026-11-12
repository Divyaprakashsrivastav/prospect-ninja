import { DEMO_CATALOG } from "@/modules/discovery/demoCatalog";
import { isExcluded, scoreProspect } from "@/modules/discovery/match";
import type {
  ProspectProvider,
  ProspectSearchCriteria,
  ProviderProspectRecord,
} from "@/modules/discovery/types";
import { parseIcp } from "@/modules/campaigns/schema";

function toIcp(criteria: ProspectSearchCriteria) {
  return parseIcp({
    jobTitles: criteria.jobTitles,
    industries: criteria.industries,
    locations: criteria.locations,
    companySize: criteria.companySize,
    keywords: criteria.keywords,
    exclusions: criteria.exclusions,
  });
}

export class DemoProspectProvider implements ProspectProvider {
  id = "demo";
  label = "Demo prospect provider (synthetic sample data)";

  async validateConnection() {
    return {
      ok: true,
      message: "Demo provider is always available. Records are labelled DEMO DATA.",
    };
  }

  async searchProspects(criteria: ProspectSearchCriteria) {
    const icp = toIcp(criteria);
    const ranked = DEMO_CATALOG.filter((record) => !isExcluded(record, icp))
      .map((record) => ({ record, match: scoreProspect(record, icp) }))
      .filter((item) => item.match.score > 0)
      .sort((a, b) => b.match.score - a.match.score);

    const start = criteria.cursor
      ? Number.parseInt(criteria.cursor, 10) || 0
      : 0;
    const pageSize = Math.min(Math.max(criteria.limit, 1), 50);
    const slice = ranked.slice(start, start + pageSize);
    const nextIndex = start + slice.length;
    return {
      records: slice.map((item) => item.record),
      nextCursor:
        nextIndex < ranked.length ? String(nextIndex) : undefined,
    };
  }

  async getProspectDetails(id: string): Promise<ProviderProspectRecord | null> {
    return DEMO_CATALOG.find((item) => item.providerProspectId === id) ?? null;
  }
}

export const demoProspectProvider = new DemoProspectProvider();
