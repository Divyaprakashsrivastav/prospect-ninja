/**
 * Live check of the RocketReach key and response shape.
 * Run: npm run check:rocketreach            (account check + 1 search of 5 results)
 *      npm run check:rocketreach -- --compare (adds 3 searches to see which filters narrow results)
 *
 * Search costs about 1 credit per non-empty page on Universal Credits. Prints counts
 * and field names only, never the key or people's details.
 */
import { env } from "../src/lib/env";
import {
  rocketReachClient,
  type RocketReachPersonQuery,
} from "../src/modules/discovery/rocketreachClient";
import { buildQuery } from "../src/modules/discovery/rocketreachProvider";

const sample = {
  jobTitles: ["Head of Sales"],
  industries: ["SaaS"],
  locations: ["Australia"],
  companySize: "11-50",
  keywords: [],
  exclusions: [],
  limit: 5,
};

async function search(label: string, query: RocketReachPersonQuery) {
  const result = await rocketReachClient.searchPeople(query, 1, 5);
  console.log(
    `${label}: ${result.profiles.length} profiles, total=${result.total ?? "n/a"}`,
  );
  return result;
}

async function main() {
  if (!env.rocketreachApiKey) {
    throw new Error("ROCKETREACH_API_KEY is not set in .env.local.");
  }
  console.log(`Mode: ${env.rocketreachApiMode}`);

  const account = await rocketReachClient.getAccount();
  console.log(`Account OK. Fields: ${Object.keys(account).join(", ")}`);

  const query = buildQuery(sample);
  console.log(`Query: ${JSON.stringify(query)}`);
  const result = await search("Full ICP", query);
  const first = result.profiles[0];
  if (first) {
    console.log(`Profile fields: ${Object.keys(first).join(", ")}`);
    const withLinkedIn = result.profiles.filter((p) => p.linkedin_url).length;
    console.log(`Profiles with linkedin_url: ${withLinkedIn}/${result.profiles.length}`);
  }

  if (process.argv.includes("--compare")) {
    const { company_industry_keywords, company_size, ...rest } = query;
    void company_industry_keywords;
    void company_size;
    await search("Without industry/size", rest);
    await search("With industry only", { ...rest, company_industry_keywords: query.company_industry_keywords });
    await search("location key instead of geo", {
      ...rest,
      geo: undefined,
      location: query.geo,
    });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
