import type { Icp } from "@/modules/campaigns/schema";

export type ProspectSearchCriteria = {
  jobTitles: string[];
  industries: string[];
  locations: string[];
  companySize?: string;
  keywords: string[];
  exclusions: string[];
  limit: number;
  cursor?: string;
};

export type ProviderProspectRecord = {
  provider: string;
  providerProspectId: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  company: string;
  industry: string;
  location: string;
  companySize?: string;
  professionalSummary: string;
  profileUrl: string;
  isDemo: boolean;
};

export type ProspectMatch = {
  score: number;
  reasons: string[];
};

export interface ProspectProvider {
  id: string;
  label: string;
  validateConnection(): Promise<{ ok: boolean; message: string }>;
  searchProspects(
    criteria: ProspectSearchCriteria,
  ): Promise<{ records: ProviderProspectRecord[]; nextCursor?: string }>;
  getProspectDetails(id: string): Promise<ProviderProspectRecord | null>;
}

export function criteriaFromIcp(
  icp: Icp,
  limit: number,
  cursor?: string,
): ProspectSearchCriteria {
  return {
    jobTitles: icp.jobTitles,
    industries: icp.industries,
    locations: icp.locations,
    companySize: icp.companySize,
    keywords: icp.keywords,
    exclusions: icp.exclusions,
    limit,
    cursor,
  };
}
