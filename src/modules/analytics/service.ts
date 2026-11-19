import { prisma } from "@/lib/db";
import { utcDateOnly } from "@/lib/dates";
import { MESSAGE_STATUS } from "@/modules/outreach/constants";

export type DashboardStats = {
  campaignCount: number;
  prospectCount: number;
  pendingApproval: number;
  approved: number;
  demoRecorded: number;
  sent: number;
  failed: number;
  discoveredToday: number;
};

export type DashboardActivityItem = {
  id: string;
  action: string;
  createdAt: Date;
  prospectName: string;
  campaignName: string;
  messageStatus: string;
};

export async function getDashboardStats(userId: string): Promise<DashboardStats> {
  const today = utcDateOnly();
  const [
    campaignCount,
    prospectCount,
    pendingApproval,
    approved,
    demoRecorded,
    sent,
    failed,
    discoveredToday,
  ] = await Promise.all([
    prisma.campaign.count({ where: { userId } }),
    prisma.prospect.count({ where: { userId } }),
    prisma.outreachMessage.count({
      where: {
        campaign: { userId },
        status: MESSAGE_STATUS.pendingReview,
      },
    }),
    prisma.outreachMessage.count({
      where: { campaign: { userId }, status: MESSAGE_STATUS.approved },
    }),
    prisma.outreachMessage.count({
      where: { campaign: { userId }, status: MESSAGE_STATUS.demoRecorded },
    }),
    prisma.outreachMessage.count({
      where: { campaign: { userId }, status: MESSAGE_STATUS.sent },
    }),
    prisma.outreachMessage.count({
      where: { campaign: { userId }, status: MESSAGE_STATUS.failed },
    }),
    prisma.prospect.count({
      where: { userId, discoveredAt: { gte: today } },
    }),
  ]);

  return {
    campaignCount,
    prospectCount,
    pendingApproval,
    approved,
    demoRecorded,
    sent,
    failed,
    discoveredToday,
  };
}

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
