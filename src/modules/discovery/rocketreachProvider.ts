import { env } from "@/lib/env";
import {
  RocketReachError,
  rocketReachClient,
  type RocketReachPersonQuery,
  type RocketReachProfile,
} from "@/modules/discovery/rocketreachClient";
import type {
  ProspectProvider,
  ProspectSearchCriteria,
  ProviderProspectRecord,
} from "@/modules/discovery/types";

/** The current RocketReach plan returns 402 for page_size above 10. */
export const PAGE_SIZE = 10;
/** Each page costs a credit, so cap pages per discovery run. */
export const MAX_PAGES_PER_RUN = 3;

/** App company-size ids → RocketReach `company_size` values. */
const COMPANY_SIZE_VALUES: Record<string, string[]> = {
  "1-10": ["1-10"],
  "11-50": ["11-50"],
  "51-200": ["51-200"],
  "201-500": ["201-500"],
  "501+": ["501-1000", "1001-5000", "5001-10000", "10001+"],
};

function clean(values: string[]) {
  return values.map((value) => value.trim()).filter(Boolean);
}

export function buildQuery(criteria: ProspectSearchCriteria): RocketReachPersonQuery {
  const query: RocketReachPersonQuery = {};
  const titles = clean(criteria.jobTitles);
  const exclusions = clean(criteria.exclusions).map((term) => `-${term}`);
  if (titles.length > 0 || exclusions.length > 0) {
    query.current_title = [...titles, ...exclusions];
  }
  const locations = clean(criteria.locations);
  if (locations.length > 0) {
    query.geo = locations;
  }
  const industries = clean(criteria.industries);
  if (industries.length > 0) {
    // Free-text industry keywords (e.g. "SaaS"); `company_industry` only accepts a fixed list.
    query.company_industry_keywords = industries;
  }
  const sizes = criteria.companySize
    ? COMPANY_SIZE_VALUES[criteria.companySize]
    : undefined;
  if (sizes) {
    query.company_size = sizes;
  }
  // Keywords are not sent: they narrow results too much. They still count in scoreProspect().
  return query;
}

export function profileToRecord(
  profile: RocketReachProfile,
): ProviderProspectRecord | null {
  const profileUrl = profile.linkedin_url?.trim();
  if (!profileUrl || profile.id === undefined || profile.id === null) {
    return null;
  }
  const [firstName = "", ...rest] = (profile.name ?? "").trim().split(/\s+/);
  const location =
    [profile.city, profile.region, profile.country]
      .map((part) => part?.trim())
      .filter(Boolean)
      .join(", ") ||
    profile.location?.trim() ||
    "";
  return {
    provider: "rocketreach",
    providerProspectId: String(profile.id),
    firstName,
    lastName: rest.join(" "),
    jobTitle: profile.current_title?.trim() ?? "",
    company: profile.current_employer?.trim() ?? "",
    // RocketReach search returns no industry, size or summary. Leave them empty rather than guess.
    industry: "",
    location,
    professionalSummary: "",
    profileUrl,
    isDemo: false,
  };
}

export class RocketReachProspectProvider implements ProspectProvider {
  id = "rocketreach";
  label = "RocketReach people search";

  async validateConnection() {
    if (!env.rocketreachApiKey) {
      return { ok: false, message: "ROCKETREACH_API_KEY is not set." };
    }
    try {
      await rocketReachClient.getAccount();
      return { ok: true, message: "RocketReach API key is valid." };
    } catch (error) {
      if (
        error instanceof RocketReachError &&
        (error.status === 401 || error.status === 403)
      ) {
        return {
          ok: false,
          message: `RocketReach rejected ROCKETREACH_API_KEY, or the plan has no API access (HTTP ${error.status}). If you're on Universal Credits, set ROCKETREACH_API_MODE=universal.`,
        };
      }
      return {
        ok: false,
        message: `Could not reach RocketReach: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  async searchProspects(
    criteria: ProspectSearchCriteria,
  ): Promise<{ records: ProviderProspectRecord[]; nextCursor?: string }> {
    const limit = Math.max(criteria.limit, 0);
    if (limit === 0) {
      return { records: [] };
    }
    const query = buildQuery(criteria);
    const seen = new Set(criteria.excludeIds ?? []);
    const records: ProviderProspectRecord[] = [];

    let start = criteria.cursor ? Number.parseInt(criteria.cursor, 10) || 1 : 1;
    let exhausted = false;
    for (let page = 0; page < MAX_PAGES_PER_RUN && records.length < limit; page++) {
      let result;
      try {
        result = await rocketReachClient.searchPeople(query, start, PAGE_SIZE);
      } catch (error) {
        // Plans that cap results at the first page answer later pages with 402.
        // Keep what we found instead of failing the run.
        if (page > 0 && error instanceof RocketReachError && error.status === 402) {
          exhausted = true;
          break;
        }
        throw error;
      }
      for (const profile of result.profiles) {
        const record = profileToRecord(profile);
        if (!record || seen.has(record.providerProspectId)) {
          continue;
        }
        seen.add(record.providerProspectId);
        records.push(record);
        if (records.length >= limit) {
          break;
        }
      }
      if (
        result.profiles.length < PAGE_SIZE ||
        (result.total !== undefined && start + PAGE_SIZE > result.total)
      ) {
        exhausted = true;
        break;
      }
      start = result.nextStart ?? start + PAGE_SIZE;
    }

    return {
      records,
      nextCursor: exhausted ? undefined : String(start),
    };
  }

  async getProspectDetails(): Promise<ProviderProspectRecord | null> {
    // A lookup costs credits and nothing in the app calls this today.
    return null;
  }
}

export const rocketReachProspectProvider = new RocketReachProspectProvider();
