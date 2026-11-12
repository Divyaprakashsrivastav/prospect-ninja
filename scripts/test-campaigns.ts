import { prisma } from "../src/lib/db";
import { getDashboardStats } from "../src/modules/analytics/service";
import {
  createCampaign,
  getCampaign,
  listCampaigns,
  setCampaignActive,
  updateCampaign,
} from "../src/modules/campaigns/service";
import type { CampaignInput } from "../src/modules/campaigns/schema";

const sample: CampaignInput = {
  name: "APAC SaaS founders",
  description: "Reach founders at SaaS companies in Australia and the US.",
  isActive: true,
  dailyDiscoverLimit: 99,
  icp: {
    jobTitles: ["CEO", "Founder"],
    industries: ["SaaS"],
    locations: ["Australia", "United States"],
    companySize: "11-50",
    keywords: ["outbound"],
    exclusions: [],
    productService: "Human-approved LinkedIn outreach for B2B teams.",
    outreachObjective: "Book a 15-minute intro call",
    tone: "professional",
  },
};

async function main() {
  const suffix = Date.now().toString();
  const owner = await prisma.user.create({
    data: {
      email: `owner-${suffix}@example.com`,
      name: "Owner",
      passwordHash: "test-hash",
    },
  });
  const other = await prisma.user.create({
    data: {
      email: `other-${suffix}@example.com`,
      name: "Other",
      passwordHash: "test-hash",
    },
  });

  const created = await createCampaign(owner.id, sample);
  if (created.dailyDiscoverLimit !== 15) {
    throw new Error(`Expected daily limit 15, got ${created.dailyDiscoverLimit}`);
  }
  if (created.userId !== owner.id) {
    throw new Error("Campaign was not associated with the owner.");
  }

  const listed = await listCampaigns(owner.id);
  if (!listed.some((item) => item.id === created.id)) {
    throw new Error("Created campaign missing from owner list.");
  }

  const hidden = await getCampaign(other.id, created.id);
  if (hidden) {
    throw new Error("Other user must not read this campaign.");
  }
  const otherList = await listCampaigns(other.id);
  if (otherList.some((item) => item.id === created.id)) {
    throw new Error("Other user list leaked owner campaign.");
  }

  const updated = await updateCampaign(owner.id, created.id, {
    ...sample,
    name: "APAC SaaS founders (updated)",
    icp: { ...sample.icp, tone: "friendly" },
  });
  if (updated.name !== "APAC SaaS founders (updated)") {
    throw new Error("Update did not persist name.");
  }

  const paused = await setCampaignActive(owner.id, created.id, false);
  if (paused.isActive) {
    throw new Error("Pause did not persist.");
  }

  const persisted = await prisma.campaign.findUniqueOrThrow({
    where: { id: created.id },
  });
  if (persisted.name !== "APAC SaaS founders (updated)" || persisted.isActive) {
    throw new Error("Database row did not persist edits.");
  }

  const stats = await getDashboardStats(owner.id);
  if (stats.campaignCount < 1) {
    throw new Error("Dashboard campaign count did not update.");
  }

  try {
    await updateCampaign(other.id, created.id, sample);
    throw new Error("Other user was allowed to edit owner campaign.");
  } catch (error) {
    if (!(error instanceof Error) || error.message !== "Campaign not found.") {
      throw error;
    }
  }

  await prisma.user.deleteMany({
    where: { id: { in: [owner.id, other.id] } },
  });

  console.log("Campaign module tests passed.");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
