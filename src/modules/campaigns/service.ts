import { prisma } from "@/lib/db";
import {
  campaignInputSchema,
  parseIcp,
  type CampaignInput,
} from "@/modules/campaigns/schema";

export async function listCampaigns(userId: string) {
  const campaigns = await prisma.campaign.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { prospects: true, messages: true } },
    },
  });
  return campaigns.map((campaign) => ({
    ...campaign,
    icp: parseIcp(campaign.icp),
  }));
}

export async function getCampaign(userId: string, id: string) {
  const campaign = await prisma.campaign.findFirst({
    where: { id, userId },
    include: {
      _count: { select: { prospects: true, messages: true } },
    },
  });
  if (!campaign) {
    return null;
  }
  return { ...campaign, icp: parseIcp(campaign.icp) };
}

export async function createCampaign(userId: string, input: CampaignInput) {
  const data = campaignInputSchema.parse(input);
  return prisma.campaign.create({
    data: {
      userId,
      name: data.name,
      isActive: data.isActive,
      dailyDiscoverLimit: data.dailyDiscoverLimit,
      icp: data.icp,
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
  return prisma.campaign.update({
    where: { id },
    data: {
      name: data.name,
      isActive: data.isActive,
      dailyDiscoverLimit: data.dailyDiscoverLimit,
      icp: data.icp,
    },
  });
}

export async function deleteCampaign(userId: string, id: string) {
  const existing = await getCampaign(userId, id);
  if (!existing) {
    throw new Error("Campaign not found.");
  }
  await prisma.campaign.delete({ where: { id } });
}
