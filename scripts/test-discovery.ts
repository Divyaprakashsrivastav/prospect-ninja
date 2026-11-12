import { prisma } from "../src/lib/db";
import { createCampaign } from "../src/modules/campaigns/service";
import type { CampaignInput } from "../src/modules/campaigns/schema";
import type { ProspectProvider } from "../src/modules/discovery/types";
import {
  discoverForCampaign,
  getDiscoveryQuota,
  getProspect,
  listProspects,
} from "../src/modules/prospects/service";

const icp: CampaignInput = {
  name: "Discovery QA",
  description: "Campaign used to verify prospect discovery rules.",
  isActive: true,
  dailyDiscoverLimit: 15,
  icp: {
    jobTitles: ["CEO", "Founder", "CTO", "Marketing Director"],
    industries: ["SaaS", "FinTech", "Healthcare"],
    locations: ["Australia", "United States", "United Kingdom"],
    companySize: "11-50",
    keywords: ["software"],
    exclusions: [],
    productService: "Human-approved LinkedIn outreach for B2B teams.",
    outreachObjective: "Book a 15-minute intro call",
    tone: "professional",
  },
};

const emptyProvider: ProspectProvider = {
  id: "empty",
  label: "Empty",
  async validateConnection() {
    return { ok: true, message: "ok" };
  },
  async searchProspects() {
    return { records: [] };
  },
  async getProspectDetails() {
    return null;
  },
};

const errorProvider: ProspectProvider = {
  id: "error",
  label: "Error",
  async validateConnection() {
    return { ok: true, message: "ok" };
  },
  async searchProspects() {
    throw new Error("Provider unavailable.");
  },
  async getProspectDetails() {
    return null;
  },
};

async function main() {
  const suffix = Date.now().toString();
  const owner = await prisma.user.create({
    data: {
      email: `disc-owner-${suffix}@example.com`,
      name: "Owner",
      passwordHash: "test-hash",
    },
  });
  const other = await prisma.user.create({
    data: {
      email: `disc-other-${suffix}@example.com`,
      name: "Other",
      passwordHash: "test-hash",
    },
  });

  const campaign = await createCampaign(owner.id, icp);

  const first = await discoverForCampaign(owner.id, campaign.id);
  if (first.added < 1) {
    throw new Error("Expected demo discovery to store prospects.");
  }
  if (first.added > 15) {
    throw new Error("First discovery exceeded 15 new prospects.");
  }
  const stored = await prisma.prospect.count({
    where: { userId: owner.id, campaignId: campaign.id },
  });
  if (stored !== first.added) {
    throw new Error("Stored prospect count does not match discovery result.");
  }
  const scored = await prisma.prospect.findMany({
    where: { userId: owner.id },
  });
  if (scored.some((row) => row.matchScore <= 0 || !row.isDemo)) {
    throw new Error("Prospects must be demo records with a positive match score.");
  }
  if (
    scored.some(
      (row) =>
        !String(row.summary ?? "").includes("DEMO DATA") &&
        !String(row.summary ?? "").includes("synthetic"),
    )
  ) {
    throw new Error("Demo records must be labelled as synthetic sample data.");
  }

  const retry = await discoverForCampaign(owner.id, campaign.id);
  const afterRetry = await prisma.prospect.count({
    where: { userId: owner.id, campaignId: campaign.id },
  });
  if (afterRetry !== stored) {
    throw new Error("Retry created duplicate prospects.");
  }
  if (retry.added !== 0 && retry.skippedDuplicates < 1 && stored < 15) {
    // If catalog still had unused matches under quota, added could be > 0.
    // When catalog is exhausted or quota filled, added is 0.
  }

  const campaignB = await createCampaign(owner.id, {
    ...icp,
    name: "Discovery QA B",
  });
  await discoverForCampaign(owner.id, campaignB.id);
  const quotaB = await getDiscoveryQuota(owner.id, campaignB.id);
  if (quotaB.used > 15 || quotaB.used + quotaB.remaining !== 15) {
    throw new Error("Quota accounting is incorrect.");
  }

  const hidden = await getProspect(other.id, scored[0]?.id ?? "missing");
  if (hidden) {
    throw new Error("Other user must not read owner prospects.");
  }
  const otherList = await listProspects(other.id);
  if (otherList.total !== 0) {
    throw new Error("Other user list leaked owner prospects.");
  }
  try {
    await discoverForCampaign(other.id, campaign.id);
    throw new Error("Other user was allowed to discover on owner campaign.");
  } catch (error) {
    if (!(error instanceof Error) || error.message !== "Campaign not found.") {
      throw error;
    }
  }

  const empty = await discoverForCampaign(owner.id, campaign.id, emptyProvider);
  if (empty.added !== 0 || empty.emptyProvider !== true) {
    throw new Error("Empty provider should add nothing.");
  }

  try {
    await discoverForCampaign(owner.id, campaign.id, errorProvider);
    throw new Error("Error provider should fail.");
  } catch (error) {
    if (!(error instanceof Error) || error.message !== "Provider unavailable.") {
      throw error;
    }
  }

  const campaignC = await createCampaign(owner.id, {
    ...icp,
    name: "Discovery QA concurrent",
  });
  const [a, b] = await Promise.all([
    discoverForCampaign(owner.id, campaignC.id),
    discoverForCampaign(owner.id, campaignC.id),
  ]);
  const concurrentCount = await prisma.prospect.count({
    where: { campaignId: campaignC.id },
  });
  if (concurrentCount > 15) {
    throw new Error("Concurrent discovery exceeded the daily cap.");
  }
  if (a.added + b.added !== concurrentCount) {
    throw new Error("Concurrent totals do not match stored rows.");
  }

  await prisma.user.deleteMany({
    where: { id: { in: [owner.id, other.id] } },
  });
  console.log("Discovery module tests passed.");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
