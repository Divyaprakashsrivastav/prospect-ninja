/**
 * Offline tests for the RocketReach discovery provider.
 * Stubs globalThis.fetch: no API key, database or credits needed.
 * Run: npm run test:rocketreach
 */
process.env.ROCKETREACH_API_KEY = "test-key";
process.env.ROCKETREACH_API_MODE = "legacy";
delete process.env.ROCKETREACH_API_BASE_URL;

type Call = { url: string; method: string; headers: Record<string, string>; body?: unknown };
type Reply = { status: number; body: unknown; headers?: Record<string, string> };

const calls: Call[] = [];
let replies: Reply[] = [];

globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
  calls.push({
    url: String(input),
    method: init?.method ?? "GET",
    headers: (init?.headers ?? {}) as Record<string, string>,
    body: typeof init?.body === "string" ? JSON.parse(init.body) : undefined,
  });
  const reply = replies.shift();
  if (!reply) {
    throw new Error(`Unexpected fetch: ${String(input)}`);
  }
  return new Response(JSON.stringify(reply.body), {
    status: reply.status,
    headers: reply.headers,
  });
}) as typeof fetch;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
}

function profile(id: number, overrides: Record<string, unknown> = {}) {
  return {
    id,
    name: `Person${id} Middle Last${id}`,
    linkedin_url: `https://www.linkedin.com/in/person-${id}`,
    current_title: "Head of Sales",
    current_employer: `Company ${id}`,
    city: "Sydney",
    region: "New South Wales",
    country: "Australia",
    ...overrides,
  };
}

function page(start: number, count: number, total?: number) {
  const profiles = Array.from({ length: count }, (_, i) => profile(start + i));
  return total === undefined
    ? profiles
    : { profiles, pagination: { start, next: start + count, total } };
}

const criteria = {
  jobTitles: ["Head of Sales", " VP Sales "],
  industries: ["SaaS"],
  locations: ["Sydney, Australia"],
  companySize: "11-50",
  keywords: ["software"],
  exclusions: ["Recruiter"],
  limit: 10,
};

async function main() {
  const { buildQuery, profileToRecord, RocketReachProspectProvider, MAX_PAGES_PER_RUN, PAGE_SIZE } =
    await import("../src/modules/discovery/rocketreachProvider");
  const { parseSearchResponse } = await import("../src/modules/discovery/rocketreachClient");
  const provider = new RocketReachProspectProvider();

  // 1. ICP → query
  const query = buildQuery(criteria);
  assert(
    JSON.stringify(query.current_title) ===
      JSON.stringify(["Head of Sales", "VP Sales", "-Recruiter"]),
    `titles + exclusions, got ${JSON.stringify(query.current_title)}`,
  );
  assert(JSON.stringify(query.geo) === JSON.stringify(["Sydney, Australia"]), "geo");
  assert(
    JSON.stringify(query.company_industry_keywords) === JSON.stringify(["SaaS"]),
    "industry keywords",
  );
  assert(JSON.stringify(query.company_size) === JSON.stringify(["11-50"]), "size");
  assert(!("keyword" in query) && !("keywords" in query), "keywords must not be sent");
  assert(
    buildQuery({ ...criteria, companySize: "501+" }).company_size?.length === 4,
    "501+ expands to the larger RocketReach buckets",
  );
  assert(
    buildQuery({ ...criteria, jobTitles: [], exclusions: [], industries: [], locations: [], companySize: undefined }) &&
      Object.keys(buildQuery({ ...criteria, jobTitles: [], exclusions: [], industries: [], locations: [], companySize: undefined })).length === 0,
    "empty ICP gives an empty query",
  );

  // 2. Mapping
  const record = profileToRecord(profile(7));
  assert(record, "profile maps");
  assert(record.firstName === "Person7" && record.lastName === "Middle Last7", "name split");
  assert(record.location === "Sydney, New South Wales, Australia", "location join");
  assert(record.provider === "rocketreach" && record.providerProspectId === "7", "ids");
  assert(record.isDemo === false && record.industry === "", "no invented fields");
  assert(record.profileUrl === "https://www.linkedin.com/in/person-7", "linkedin url");
  assert(profileToRecord(profile(8, { linkedin_url: null })) === null, "drop no-LinkedIn profiles");
  assert(
    profileToRecord(profile(9, { city: null, region: null, country: null, location: "Remote" }))
      ?.location === "Remote",
    "location falls back",
  );

  // 3. Response envelopes
  assert(parseSearchResponse([profile(1)]).profiles.length === 1, "bare array envelope");
  const wrapped = parseSearchResponse(page(1, 2, 50));
  assert(wrapped.profiles.length === 2 && wrapped.total === 50 && wrapped.nextStart === 3, "wrapped envelope");

  // 4. Search request, excludeIds, limit stops paging
  calls.length = 0;
  assert(PAGE_SIZE === 10, "page size is 10 (plan limit)");
  replies = [
    { status: 201, body: page(1, 10, 1000) },
    { status: 201, body: page(11, 10, 1000) },
  ];
  const result = await provider.searchProspects({ ...criteria, excludeIds: ["1", "2", "3"] });
  assert(calls.length === 2, `7 new on page 1, so page 2 is needed; made ${calls.length} calls`);
  const call = calls[0];
  assert(call.url === "https://api.rocketreach.co/api/v2/person/search", `legacy url, got ${call.url}`);
  assert(call.method === "POST" && call.headers["Api-Key"] === "test-key", "auth header");
  const body = call.body as { start: number; page_size: number; query: unknown };
  assert(body.start === 1 && body.page_size === 10, "paging params");
  assert((calls[1].body as { start: number }).start === 11, "page 2 starts at 11");
  assert(JSON.stringify(body.query) === JSON.stringify(query), "query sent");
  assert(result.records.length === 10, `limit respected, got ${result.records.length}`);
  assert(result.records[0].providerProspectId === "4", "excludeIds skipped");

  // 5. Page cap
  calls.length = 0;
  replies = Array.from({ length: MAX_PAGES_PER_RUN }, (_, i) => ({
    status: 201,
    body: page(1 + i * 10, 10, 100_000),
  }));
  const allSeen = Array.from({ length: 1000 }, (_, i) => String(i + 1));
  const capped = await provider.searchProspects({ ...criteria, excludeIds: allSeen });
  assert(calls.length === MAX_PAGES_PER_RUN, `stops after ${MAX_PAGES_PER_RUN} pages`);
  assert(capped.records.length === 0, "all excluded");

  // 6. Short page ends the search
  calls.length = 0;
  replies = [{ status: 201, body: page(1, 3) }];
  const short = await provider.searchProspects({ ...criteria, limit: 50 });
  assert(calls.length === 1 && short.records.length === 3 && !short.nextCursor, "short page ends");

  // 6b. 402 on a later page keeps page-1 results; 402 on page 1 fails
  calls.length = 0;
  replies = [
    { status: 201, body: page(1, 10, 2642) },
    { status: 402, body: { detail: "Subscribe to a plan", error: "Subscription Required" } },
  ];
  const capped402 = await provider.searchProspects({ ...criteria, limit: 30 });
  assert(calls.length === 2 && capped402.records.length === 10, "402 on page 2 keeps page 1");
  assert(!capped402.nextCursor, "402 ends the search");
  replies = [{ status: 402, body: { detail: "Subscribe to a plan" } }];
  let threw = false;
  try {
    await provider.searchProspects({ ...criteria, limit: 5 });
  } catch (error) {
    threw = (error as { status?: number }).status === 402;
  }
  assert(threw, "402 on page 1 throws");

  // 7. limit 0 makes no call
  calls.length = 0;
  await provider.searchProspects({ ...criteria, limit: 0 });
  assert(calls.length === 0, "limit 0 makes no request");

  // 8. 429 is retried
  calls.length = 0;
  replies = [
    { status: 429, body: { detail: "slow down" }, headers: { "Retry-After": "0" } },
    { status: 201, body: page(1, 2) },
  ];
  const retried = await provider.searchProspects({ ...criteria, limit: 5 });
  assert(calls.length === 2 && retried.records.length === 2, "429 retried");

  // 9. validateConnection
  replies = [{ status: 200, body: { id: 1 } }];
  assert((await provider.validateConnection()).ok, "valid key");
  assert(calls.at(-1)?.url.endsWith("/account/"), "legacy account endpoint");
  replies = [{ status: 401, body: { detail: "Invalid API key" } }];
  const bad = await provider.validateConnection();
  assert(!bad.ok && bad.message.includes("rejected ROCKETREACH_API_KEY"), "401 message");
  replies = [{ status: 403, body: { detail: "no access" } }];
  assert(!(await provider.validateConnection()).ok, "403 not ok");

  console.log("RocketReach provider tests passed.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
