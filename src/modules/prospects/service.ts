import { Prisma } from "@prisma/client";
import { prisma, runInteractiveTransaction } from "@/lib/db";
import { utcDateOnly } from "@/lib/dates";
import { DAILY_PROSPECT_LIMIT, parseIcp } from "@/modules/campaigns/schema";
import { getProspectProvider } from "@/modules/discovery";
import { isExcluded, scoreProspect } from "@/modules/discovery/match";
import { criteriaFromIcp } from "@/modules/discovery/types";
import type { ProspectProvider } from "@/modules/discovery/types";
import type { ProviderProspectRecord } from "@/modules/discovery/types";

export type ProspectListFilters = {
  campaignId?: string;
  q?: string;
  jobTitle?: string;
  industry?: string;
  location?: string;
  page?: number;
  pageSize?: number;
};

export async function getDiscoveryQuota(userId: string, campaignId: string) {
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, userId },
    select: { id: true, dailyDiscoverLimit: true },
  });
  if (!campaign) {
    throw new Error("Campaign not found.");
  }
  const limit = Math.min(campaign.dailyDiscoverLimit, DAILY_PROSPECT_LIMIT);
  const run = await prisma.discoveryRun.findUnique({
    where: {
      campaignId_runDate: { campaignId, runDate: utcDateOnly() },
    },
  });
  const used = run?.discoveredCount ?? 0;
  return {
    campaignId,
    limit,
    used,
    remaining: Math.max(limit - used, 0),
  };
}

export async function listProspects(
  userId: string,
  filters: ProspectListFilters = {},
) {
  const page = Math.max(filters.page ?? 1, 1);
  const pageSize = Math.min(Math.max(filters.pageSize ?? 20, 1), 50);
  const where: Prisma.ProspectWhereInput = {
    userId,
    ...(filters.campaignId ? { campaignId: filters.campaignId } : {}),
    ...(filters.jobTitle
      ? { jobTitle: { contains: filters.jobTitle, mode: "insensitive" } }
      : {}),
    ...(filters.industry
      ? { industry: { contains: filters.industry, mode: "insensitive" } }
      : {}),
    ...(filters.location
      ? { location: { contains: filters.location, mode: "insensitive" } }
      : {}),
    ...(filters.q
      ? {
          OR: [
            { fullName: { contains: filters.q, mode: "insensitive" } },
            { companyName: { contains: filters.q, mode: "insensitive" } },
            { jobTitle: { contains: filters.q, mode: "insensitive" } },
            { headline: { contains: filters.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [total, prospects] = await Promise.all([
    prisma.prospect.count({ where }),
    prisma.prospect.findMany({
      where,
      include: {
        campaign: { select: { name: true } },
        messages: {
          select: {
            id: true,
            status: true,
            generationStatus: true,
            aiProvider: true,
            body: true,
            originalBody: true,
          },
          take: 1,
        },
      },
      orderBy: [{ matchScore: "desc" }, { discoveredAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    prospects,
    total,
    page,
    pageSize,
    pageCount: Math.max(Math.ceil(total / pageSize), 1),
  };
}

export async function getProspect(userId: string, id: string) {
  return prisma.prospect.findFirst({
    where: { id, userId },
    include: {
      campaign: { select: { id: true, name: true } },
      messages: {
        take: 1,
      },
    },
  });
}

function normalizeRecord(record: ProviderProspectRecord) {
  return {
    provider: record.provider,
    externalId: record.providerProspectId,
    linkedinUrl: record.profileUrl,
    firstName: record.firstName,
    lastName: record.lastName,
    fullName: `${record.firstName} ${record.lastName}`.trim(),
    jobTitle: record.jobTitle,
    headline: record.jobTitle,
    companyName: record.company,
    companySize: record.companySize,
    location: record.location,
    industry: record.industry,
    summary: record.professionalSummary,
    isDemo: record.isDemo,
    rawProfile: {
      providerProspectId: record.providerProspectId,
      labelled: record.isDemo ? "DEMO DATA" : "provider",
      companySize: record.companySize,
    },
  };
}

export async function discoverForCampaign(
  userId: string,
  campaignId: string,
  providerOverride?: ProspectProvider,
) {
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, userId },
  });
  if (!campaign) {
    throw new Error("Campaign not found.");
  }
  if (!campaign.isActive) {
    throw new Error("Campaign is paused.");
  }

  const limit = Math.min(campaign.dailyDiscoverLimit, DAILY_PROSPECT_LIMIT);
  const runDate = utcDateOnly();
  const provider = providerOverride ?? (await getProspectProvider(userId));
  const connection = await provider.validateConnection();
  if (!connection.ok && !providerOverride) {
    throw new Error(connection.message);
  }
  const icp = parseIcp(campaign.icp);
  const search = await provider.searchProspects(
    criteriaFromIcp(icp, 50),
  );
  const providerReturned = search.records.length;

  const added: Array<{
    id: string;
    fullName: string;
    matchScore: number;
    matchReasons: string[];
  }> = [];
  let skippedDuplicates = 0;
  let remaining = 0;

  await runInteractiveTransaction(async (tx) => {
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

    for (const record of search.records) {
      if (added.length >= remaining) {
        break;
      }
      if (isExcluded(record, icp)) {
        continue;
      }
      const match = scoreProspect(record, icp);
      if (match.score <= 0) {
        continue;
      }
      const normalized = normalizeRecord(record);
      const duplicate = await tx.prospect.findFirst({
        where: {
          userId,
          OR: [
            { linkedinUrl: normalized.linkedinUrl },
            {
              provider: normalized.provider,
              externalId: normalized.externalId,
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
            provider: normalized.provider,
            externalId: normalized.externalId,
            linkedinUrl: normalized.linkedinUrl,
            fullName: normalized.fullName,
            firstName: normalized.firstName,
            lastName: normalized.lastName,
            headline: normalized.headline,
            jobTitle: normalized.jobTitle,
            companyName: normalized.companyName,
            companySize: normalized.companySize,
            location: normalized.location,
            industry: normalized.industry,
            summary: normalized.summary,
            matchScore: match.score,
            matchReasons: match.reasons,
            isDemo: normalized.isDemo,
            rawProfile: normalized.rawProfile,
          },
        });
        added.push({
          id: created.id,
          fullName: created.fullName,
          matchScore: match.score,
          matchReasons: match.reasons,
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          skippedDuplicates += 1;
          continue;
        }
        throw error;
      }
    }

    await tx.discoveryRun.update({
      where: { id: run.id },
      data: {
        discoveredCount: { increment: added.length },
        status: "completed",
      },
    });
  });

  const quota = await getDiscoveryQuota(userId, campaignId);

  return {
    added: added.length,
    prospects: added,
    skippedDuplicates,
    remainingAfter: quota.remaining,
    dailyLimit: limit,
    usedToday: quota.used,
    provider: provider.id,
    demo: provider.id === "demo",
    providerReturned,
    emptyProvider: providerReturned === 0,
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
