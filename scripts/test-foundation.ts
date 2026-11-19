import { prisma } from "../src/lib/db";
import { assertOwned, ownedByUser, OwnershipError } from "../src/lib/ownership";
import {
  getDashboardStats,
  getRecentActivity,
} from "../src/modules/analytics/service";
import { createCampaign, getCampaign, listCampaigns } from "../src/modules/campaigns/service";
import type { CampaignInput } from "../src/modules/campaigns/schema";
import { MESSAGE_STATUS } from "../src/modules/outreach/constants";

const sample: CampaignInput = {
  name: "Foundation QA",
  description: "Phase 1 ownership and dashboard isolation checks.",
  isActive: true,
  dailyDiscoverLimit: 15,
  icp: {
    jobTitles: ["CEO"],
    industries: ["SaaS"],
    locations: ["Australia"],
    companySize: "11-50",
    keywords: [],
    exclusions: [],
    productService: "Human-approved LinkedIn outreach for B2B teams.",
    outreachObjective: "Share a concise intro without fabricating research.",
    tone: "professional",
  },
};

async function main() {
  try {
    assertOwned(null);
    throw new Error("assertOwned should throw for null.");
  } catch (error) {
    if (!(error instanceof OwnershipError)) {
      throw error;
    }
  }
  if (ownedByUser({ userId: "a" }, "b") !== null) {
    throw new Error("ownedByUser must reject foreign userId.");
  }

  const suffix = Date.now().toString();
  const owner = await prisma.user.create({
    data: {
      email: `foundation-owner-${suffix}@example.com`,
      name: "Foundation Owner",
      passwordHash: "test-hash",
    },
  });
  const other = await prisma.user.create({
    data: {
      email: `foundation-other-${suffix}@example.com`,
      name: "Foundation Other",
      passwordHash: "test-hash",
    },
  });

  const campaign = await createCampaign(owner.id, sample);
  if (await getCampaign(other.id, campaign.id)) {
    throw new Error("Other user must not load owner campaign.");
  }
  if ((await listCampaigns(other.id)).some((item) => item.id === campaign.id)) {
    throw new Error("Other user campaign list leaked owner data.");
  }

  const stats = await getDashboardStats(owner.id);
  if (stats.campaignCount < 1) {
    throw new Error("Owner dashboard stats must include the new campaign.");
  }
  const otherStats = await getDashboardStats(other.id);
  if (otherStats.campaignCount !== 0) {
    throw new Error("Other user stats must not include owner campaigns.");
  }

  const prospect = await prisma.prospect.create({
    data: {
      userId: owner.id,
      campaignId: campaign.id,
      provider: "demo",
      externalId: `foundation-${suffix}`,
      linkedinUrl: `https://www.linkedin.com/in/foundation-${suffix}`,
      fullName: "Foundation Prospect",
      firstName: "Foundation",
      lastName: "Prospect",
      matchScore: 10,
      matchReasons: ["title"],
      isDemo: true,
      rawProfile: {},
    },
  });
  const message = await prisma.outreachMessage.create({
    data: {
      prospectId: prospect.id,
      campaignId: campaign.id,
      status: MESSAGE_STATUS.draft,
      body: "Foundation draft used only for activity isolation tests.",
      originalBody: "Foundation draft used only for activity isolation tests.",
      generationStatus: "demo",
      aiProvider: "demo",
      aiModel: "demo-template",
    },
  });
  await prisma.messageAuditEvent.create({
    data: {
      messageId: message.id,
      actorUserId: owner.id,
      action: "generated",
      bodySnapshot: message.body,
    },
  });

  const ownerActivity = await getRecentActivity(owner.id);
  if (!ownerActivity.some((item) => item.prospectName === "Foundation Prospect")) {
    throw new Error("Owner recent activity missing generated audit event.");
  }
  const otherActivity = await getRecentActivity(other.id);
  if (otherActivity.some((item) => item.prospectName === "Foundation Prospect")) {
    throw new Error("Other user activity leaked owner audit events.");
  }

  await prisma.messageAuditEvent.deleteMany({
    where: { actorUserId: { in: [owner.id, other.id] } },
  });
  await prisma.user.deleteMany({
    where: { id: { in: [owner.id, other.id] } },
  });

  console.log("Foundation hardening tests passed.");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
