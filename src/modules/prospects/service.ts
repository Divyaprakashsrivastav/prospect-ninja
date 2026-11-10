import { prisma } from "@/lib/db";
import { utcDateOnly } from "@/lib/dates";
import { parseIcp } from "@/modules/campaigns/schema";
import { getActiveProvider } from "@/modules/integrations/service";
import { generateDraftForProspect } from "@/modules/outreach/service";

const DEFAULT_DAILY_LIMIT = 15;

export async function listProspects(userId: string, campaignId?: string) {
  return prisma.prospect.findMany({
    where: {
      userId,
      ...(campaignId ? { campaignId } : {}),
    },
    include: {
      campaign: { select: { name: true } },
      messages: {
        select: { id: true, status: true },
        take: 1,
      },
    },
    orderBy: { discoveredAt: "desc" },
  });
}

export async function discoverForCampaign(userId: string, campaignId: string) {
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, userId },
  });
  if (!campaign) {
    throw new Error("Campaign not found.");
  }
  if (!campaign.isActive) {
    throw new Error("Campaign is paused.");
  }

  const limit = Math.min(campaign.dailyDiscoverLimit, DEFAULT_DAILY_LIMIT);
  const runDate = utcDateOnly();
  const provider = await getActiveProvider(userId);
  const icp = parseIcp(campaign.icp);

  const addedIds: string[] = [];
  let skippedDuplicates = 0;
  let remaining = 0;

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      SELECT pg_advisory_xact_lock(hashtext(${campaignId}))
    `;

    const run = await tx.discoveryRun.upsert({
      where: {
        campaignId_runDate: { campaignId, runDate },
      },
      update: { status: "running", errorMessage: null },
      create: {
        campaignId,
        runDate,
        discoveredCount: 0,
        status: "running",
      },
    });

    remaining = Math.max(limit - run.discoveredCount, 0);
    if (remaining === 0) {
      await tx.discoveryRun.update({
        where: { id: run.id },
        data: { status: "completed" },
      });
      return;
    }

    const candidates = await provider.discoverProspects({
      icp,
      limit: remaining,
    });

    for (const candidate of candidates) {
      if (addedIds.length >= remaining) {
        break;
      }
      const duplicate = await tx.prospect.findFirst({
        where: {
          userId,
          OR: [
            { linkedinUrl: candidate.linkedinUrl },
            {
              provider: candidate.provider,
              externalId: candidate.externalId,
            },
          ],
        },
      });
      if (duplicate) {
        skippedDuplicates += 1;
        continue;
      }
      try {
        const created = await tx.prospect.create({
          data: {
            userId,
            campaignId,
            provider: candidate.provider,
            externalId: candidate.externalId,
            linkedinUrl: candidate.linkedinUrl,
            fullName: candidate.fullName,
            headline: candidate.headline,
            companyName: candidate.companyName,
            location: candidate.location,
            industry: candidate.industry,
            rawProfile: candidate.rawProfile,
          },
        });
        addedIds.push(created.id);
      } catch {
        skippedDuplicates += 1;
      }
    }

    await tx.discoveryRun.update({
      where: { id: run.id },
      data: {
        discoveredCount: { increment: addedIds.length },
        status: "completed",
      },
    });
  });

  for (const prospectId of addedIds) {
    try {
      await generateDraftForProspect(userId, prospectId);
    } catch (error) {
      console.error("Draft generation failed", prospectId, error);
    }
  }

  return {
    added: addedIds.length,
    skippedDuplicates,
    remainingAfter: Math.max(remaining - addedIds.length, 0),
    dailyLimit: limit,
    provider: provider.id,
    demo: provider.id === "demo",
  };
}

export async function discoverAllActiveCampaigns() {
  const campaigns = await prisma.campaign.findMany({
    where: { isActive: true },
    select: { id: true, userId: true, name: true },
  });
  const results = [];
  for (const campaign of campaigns) {
    try {
      const result = await discoverForCampaign(campaign.userId, campaign.id);
      results.push({ campaignId: campaign.id, name: campaign.name, ...result });
    } catch (error) {
      results.push({
        campaignId: campaign.id,
        name: campaign.name,
        error: error instanceof Error ? error.message : "Discovery failed",
      });
    }
  }
  return results;
}
