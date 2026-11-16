import { env } from "@/lib/env";

/**
 * Minimal client for the RocketReach v2 People Search API.
 * Docs: https://docs.rocketreach.co/reference/people-search-api
 *
 * Auth is the `Api-Key` header. Search returns profiles with LinkedIn URL,
 * name, title, employer and location, without contact info. Lookups (emails
 * and phones) are not used here.
 */

const TIMEOUT_MS = 30_000;
const MAX_RETRIES = 3;

export class RocketReachError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly body?: string,
  ) {
    super(message);
    this.name = "RocketReachError";
  }
}

export type RocketReachProfile = {
  id: number | string;
  name?: string | null;
  linkedin_url?: string | null;
  current_title?: string | null;
  current_employer?: string | null;
  current_employer_domain?: string | null;
  location?: string | null;
  city?: string | null;
  region?: string | null;
  country?: string | null;
};

/** Filters for `query`. All values are arrays; a leading "-" excludes a value. */
export type RocketReachPersonQuery = {
  current_title?: string[];
  geo?: string[];
  company_size?: string[];
  company_industry_keywords?: string[];
  [key: string]: string[] | undefined;
};

export type RocketReachSearchPage = {
  profiles: RocketReachProfile[];
  total?: number;
  nextStart?: number;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function paths() {
  return env.rocketreachApiMode === "universal"
    ? { search: "/universal/person/search", account: "/universal/account/" }
    : { search: "/person/search", account: "/account/" };
}

async function request<T>(
  method: "GET" | "POST",
  path: string,
  body?: unknown,
): Promise<T> {
  const apiKey = env.rocketreachApiKey;
  if (!apiKey) {
    throw new RocketReachError("ROCKETREACH_API_KEY is not set.");
  }
  const url = `${env.rocketreachApiBaseUrl.replace(/\/+$/, "")}${path}`;
  const headers: Record<string, string> = {
    "Api-Key": apiKey,
    Accept: "application/json",
  };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  let lastError: RocketReachError | undefined;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (error) {
      lastError = new RocketReachError(
        `RocketReach request failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      if (attempt < MAX_RETRIES) {
        await sleep(1000 * 2 ** attempt);
        continue;
      }
      throw lastError;
    }

    const text = await res.text();
    if (res.ok) {
      return (text ? JSON.parse(text) : {}) as T;
    }

    lastError = new RocketReachError(
      `RocketReach ${method} ${path} failed with ${res.status}: ${text.slice(0, 300)}`,
      res.status,
      text,
    );
    if ((res.status === 429 || res.status >= 500) && attempt < MAX_RETRIES) {
      const retryAfter = Number.parseInt(res.headers.get("Retry-After") ?? "", 10);
      await sleep(
        Number.isFinite(retryAfter) ? retryAfter * 1000 : 1000 * 2 ** attempt,
      );
      continue;
    }
    throw lastError;
  }
  throw lastError ?? new RocketReachError("RocketReach request failed after retries.");
}

/**
 * The OpenAPI schema documents a bare array of profiles, while RocketReach's
 * own SDKs read `{ profiles, pagination: { start, next, total } }`. Accept both.
 */
export function parseSearchResponse(raw: unknown): RocketReachSearchPage {
  if (Array.isArray(raw)) {
    return { profiles: raw as RocketReachProfile[] };
  }
  const obj = (raw ?? {}) as {
    profiles?: RocketReachProfile[];
    pagination?: { total?: number; next?: number };
  };
  return {
    profiles: Array.isArray(obj.profiles) ? obj.profiles : [],
    total: obj.pagination?.total,
    nextStart: obj.pagination?.next,
  };
}

export const rocketReachClient = {
  /** Account details; validates the key without spending search credits. */
  getAccount() {
    return request<Record<string, unknown>>("GET", paths().account);
  },

  /** One page of results (1 credit per non-empty page on Universal Credits). */
  async searchPeople(
    query: RocketReachPersonQuery,
    start = 1,
    pageSize = 100,
  ): Promise<RocketReachSearchPage> {
    const raw = await request<unknown>("POST", paths().search, {
      start,
      page_size: pageSize,
      query,
      order_by: "relevance",
    });
    return parseSearchResponse(raw);
  },
};
