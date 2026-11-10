import { prisma } from "@/lib/db";
import { utcDateOnly } from "@/lib/dates";
import { MESSAGE_STATUS } from "@/modules/outreach/constants";

export async function getDashboardStats(userId: string) {
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
