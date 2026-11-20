import { prisma } from "@/lib/db";
import { utcDateOnly } from "@/lib/dates";
import { parseIcp } from "@/modules/campaigns/schema";
import {
  AUDIT_ACTION,
  GENERATION_STATUS,
  MESSAGE_STATUS,
} from "@/modules/outreach/constants";

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfUtcDay(date: Date): Date {
  return utcDateOnly(date);
}

function daysAgo(n: number, from = new Date()): Date {
  return startOfUtcDay(new Date(from.getTime() - n * DAY_MS));
}

function emptySeries(days: number): Array<{ date: string; count: number }> {
  const series: Array<{ date: string; count: number }> = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = daysAgo(i);
    series.push({ date: d.toISOString().slice(0, 10), count: 0 });
  }
  return series;
}

export async function getDashboardStats(userId: string) {
  const today = utcDateOnly();
  const yesterday = daysAgo(1);
  const [
    campaignCount,
    prospectCount,
    discoveredToday,
    discoveredYesterday,
    aiMessagesGenerated,
    messageGroups,
  ] = await Promise.all([
    prisma.campaign.count({ where: { userId } }),
    prisma.prospect.count({ where: { userId } }),
    prisma.prospect.count({
      where: { userId, discoveredAt: { gte: today } },
    }),
    prisma.prospect.count({
      where: {
        userId,
        discoveredAt: { gte: yesterday, lt: today },
      },
    }),
    prisma.outreachMessage.count({
      where: {
        campaign: { userId },
        generationStatus: {
          in: [GENERATION_STATUS.completed, GENERATION_STATUS.demo],
        },
      },
    }),
    prisma.outreachMessage.groupBy({
      by: ["status"],
      where: { campaign: { userId } },
      _count: { _all: true },
    }),
  ]);

  const byStatus = Object.fromEntries(
    messageGroups.map((row) => [row.status, row._count._all]),
  ) as Record<string, number>;

  return {
    campaignCount,
    prospectCount,
    pendingApproval: byStatus[MESSAGE_STATUS.pendingReview] ?? 0,
    approved: byStatus[MESSAGE_STATUS.approved] ?? 0,
    demoRecorded: byStatus[MESSAGE_STATUS.demoRecorded] ?? 0,
    sent: byStatus[MESSAGE_STATUS.sent] ?? 0,
    invitationsSent: byStatus[MESSAGE_STATUS.invitationSent] ?? 0,
    failed: byStatus[MESSAGE_STATUS.failed] ?? 0,
    discoveredToday,
    discoveredYesterday,
    aiMessagesGenerated,
  };
}

export type DashboardStats = Awaited<ReturnType<typeof getDashboardStats>>;

function bucketByDay(
  days: number,
  dates: Date[],
): Array<{ date: string; count: number }> {
  const counts = new Map<string, number>();
  for (const value of dates) {
    const key = startOfUtcDay(value).toISOString().slice(0, 10);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return emptySeries(days).map((point) => ({
    ...point,
    count: counts.get(point.date) ?? 0,
  }));
}

export async function getAnalyticsSeries(userId: string, days = 14) {
  const since = daysAgo(days - 1);

  const [campaigns, prospects, messages, statusGroups] = await Promise.all([
    prisma.campaign.findMany({
      where: { userId, createdAt: { gte: since } },
      select: { createdAt: true },
    }),
    prisma.prospect.findMany({
      where: { userId, discoveredAt: { gte: since } },
      select: { discoveredAt: true },
    }),
    prisma.outreachMessage.findMany({
      where: {
        campaign: { userId },
        createdAt: { gte: since },
        generationStatus: {
          in: [GENERATION_STATUS.completed, GENERATION_STATUS.demo],
        },
      },
      select: { createdAt: true },
    }),
    prisma.outreachMessage.groupBy({
      by: ["status"],
      where: { campaign: { userId } },
      _count: { _all: true },
    }),
  ]);

  const statusDistribution = statusGroups
    .map((row) => ({
      status: row.status,
      count: row._count._all,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    days,
    campaignsCreated: bucketByDay(
      days,
      campaigns.map((row) => row.createdAt),
    ),
    prospectsDiscovered: bucketByDay(
      days,
      prospects.map((row) => row.discoveredAt),
    ),
    messagesGenerated: bucketByDay(
      days,
      messages.map((row) => row.createdAt),
    ),
    statusDistribution,
  };
}

export type AnalyticsSeries = Awaited<ReturnType<typeof getAnalyticsSeries>>;

export async function getCampaignPerformance(userId: string) {
  const campaigns = await prisma.campaign.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: {
        select: {
          prospects: true,
          messages: true,
        },
      },
    },
  });

  const pendingByCampaign = await prisma.outreachMessage.groupBy({
    by: ["campaignId"],
    where: {
      campaign: { userId },
      status: MESSAGE_STATUS.pendingReview,
    },
    _count: { _all: true },
  });
  const pendingMap = new Map(
    pendingByCampaign.map((row) => [row.campaignId, row._count._all]),
  );

  return campaigns.map((campaign) => {
    const icp = parseIcp(campaign.icp);
    return {
      id: campaign.id,
      name: campaign.name,
      isActive: campaign.isActive,
      updatedAt: campaign.updatedAt,
      createdAt: campaign.createdAt,
      industry: icp.industries[0] ?? "—",
      location: icp.locations[0] ?? "—",
      prospectCount: campaign._count.prospects,
      messageCount: campaign._count.messages,
      pendingApprovals: pendingMap.get(campaign.id) ?? 0,
    };
  });
}

export type CampaignPerformance = Awaited<
  ReturnType<typeof getCampaignPerformance>
>[number];

const ACTIVITY_LABELS: Record<string, string> = {
  campaign_created: "Campaign created",
  prospects_discovered: "Prospects discovered",
  [AUDIT_ACTION.generated]: "AI message generated",
  [AUDIT_ACTION.edited]: "Message edited",
  [AUDIT_ACTION.approved]: "Message approved",
  [AUDIT_ACTION.rejected]: "Message rejected",
  [AUDIT_ACTION.sendAttempted]: "Send attempted",
  [AUDIT_ACTION.sendSucceeded]: "Message sent",
  [AUDIT_ACTION.sendFailed]: "Send failed",
  [AUDIT_ACTION.demoSend]: "Demo send recorded",
};

export async function listRecentActivity(userId: string, limit = 24) {
  const [auditEvents, recentCampaigns, recentRuns] = await Promise.all([
    prisma.messageAuditEvent.findMany({
      where: { actorUserId: userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        message: {
          select: {
            prospect: { select: { fullName: true } },
            campaign: { select: { name: true } },
          },
        },
      },
    }),
    prisma.campaign.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, name: true, createdAt: true },
    }),
    prisma.discoveryRun.findMany({
      where: {
        campaign: { userId },
        discoveredCount: { gt: 0 },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        campaign: { select: { name: true } },
      },
    }),
  ]);

  type Item = {
    id: string;
    type: string;
    title: string;
    detail: string;
    createdAt: Date;
  };

  const items: Item[] = [];

  for (const campaign of recentCampaigns) {
    items.push({
      id: `campaign-${campaign.id}`,
      type: "campaign_created",
      title: ACTIVITY_LABELS.campaign_created,
      detail: campaign.name,
      createdAt: campaign.createdAt,
    });
  }

  for (const run of recentRuns) {
    items.push({
      id: `discovery-${run.id}`,
      type: "prospects_discovered",
      title: ACTIVITY_LABELS.prospects_discovered,
      detail: `${run.discoveredCount} in ${run.campaign.name}`,
      createdAt: run.createdAt,
    });
  }

  for (const event of auditEvents) {
    items.push({
      id: `audit-${event.id}`,
      type: event.action,
      title: ACTIVITY_LABELS[event.action] ?? event.action.replaceAll("_", " "),
      detail: [
        event.message.prospect.fullName,
        event.message.campaign.name,
      ]
        .filter(Boolean)
        .join(" · "),
      createdAt: event.createdAt,
    });
  }

  return items
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, limit);
}

export type ActivityItem = Awaited<ReturnType<typeof listRecentActivity>>[number];

export type DashboardActivityItem = {
  id: string;
  action: string;
  createdAt: Date;
  prospectName: string;
  campaignName: string;
  messageStatus: string;
};

/** Recent audit events for this user only — never fabricated. */
export async function getRecentActivity(
  userId: string,
  limit = 8,
): Promise<DashboardActivityItem[]> {
  const events = await prisma.messageAuditEvent.findMany({
    where: {
      actorUserId: userId,
      message: { campaign: { userId } },
    },
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(limit, 1), 20),
    select: {
      id: true,
      action: true,
      createdAt: true,
      message: {
        select: {
          status: true,
          prospect: { select: { fullName: true } },
          campaign: { select: { name: true } },
        },
      },
    },
  });

  return events.map((event) => ({
    id: event.id,
    action: event.action,
    createdAt: event.createdAt,
    prospectName: event.message.prospect.fullName,
    campaignName: event.message.campaign.name,
    messageStatus: event.message.status,
  }));
}

export function formatActivityAction(action: string): string {
  switch (action) {
    case "generated":
      return "Draft generated";
    case "edited":
      return "Draft edited";
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "send_attempted":
      return "Send attempted";
    case "send_succeeded":
      return "Sent";
    case "send_failed":
      return "Send failed";
    case "demo_send":
      return "Demo recorded (not sent on LinkedIn)";
    default:
      return action.replaceAll("_", " ");
  }
}
