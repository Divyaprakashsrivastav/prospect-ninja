import { prisma } from "@/lib/db";
import { MESSAGE_STATUS } from "@/modules/outreach/constants";
import {
  campaignInputSchema,
  campaignStatusSchema,
  clampDailyLimit,
  companySizeBounds,
  parseIcp,
  type CampaignInput,
} from "@/modules/campaigns/schema";

function mapCampaign<
  T extends {
    icp: unknown;
    _count: { prospects: number; messages: number };
  },
>(campaign: T) {
  return {
    ...campaign,
    icp: parseIcp(campaign.icp),
    prospectCount: campaign._count.prospects,
    pendingApprovals: campaign._count.messages,
  };
}

const campaignInclude = {
  _count: {
    select: {
      prospects: true,
      messages: { where: { status: MESSAGE_STATUS.pendingReview } },
    },
  },
} as const;

export async function listCampaigns(userId: string) {
  const campaigns = await prisma.campaign.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: campaignInclude,
  });
  return campaigns.map(mapCampaign);
}

export async function getCampaign(userId: string, id: string) {
  const campaign = await prisma.campaign.findFirst({
    where: { id, userId },
    include: campaignInclude,
  });
  if (!campaign) {
    return null;
  }
  return mapCampaign(campaign);
}

export async function createCampaign(userId: string, input: CampaignInput) {
  const data = campaignInputSchema.parse(input);
  const bounds = companySizeBounds(data.icp.companySize);
  return prisma.campaign.create({
    data: {
      userId,
      name: data.name,
      description: data.description,
      isActive: data.isActive,
      dailyDiscoverLimit: clampDailyLimit(data.dailyDiscoverLimit),
      icp: {
        ...data.icp,
        ...bounds,
      },
    },
  });
}

export async function updateCampaign(
  userId: string,
  id: string,
  input: CampaignInput,
) {
  const existing = await getCampaign(userId, id);
  if (!existing) {
    throw new Error("Campaign not found.");
  }
  const data = campaignInputSchema.parse(input);
  const bounds = companySizeBounds(data.icp.companySize);
  return prisma.campaign.update({
    where: { id },
    data: {
      name: data.name,
      description: data.description,
      isActive: data.isActive,
      dailyDiscoverLimit: clampDailyLimit(data.dailyDiscoverLimit),
      icp: {
        ...data.icp,
        ...bounds,
      },
    },
  });
}

export async function setCampaignActive(
  userId: string,
  id: string,
  isActive: boolean,
) {
  const existing = await getCampaign(userId, id);
  if (!existing) {
    throw new Error("Campaign not found.");
  }
  const parsed = campaignStatusSchema.parse({ isActive });
  return prisma.campaign.update({
    where: { id },
    data: { isActive: parsed.isActive },
  });
}

export async function deleteCampaign(userId: string, id: string) {
  const existing = await getCampaign(userId, id);
  if (!existing) {
    throw new Error("Campaign not found.");
  }
  await prisma.campaign.delete({ where: { id } });
}
