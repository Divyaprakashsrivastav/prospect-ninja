import { cron, NonRetriableError } from "inngest";
import { prisma } from "@/lib/db";
import { discoverForCampaign } from "@/modules/prospects/service";
import { campaignDiscoverRequested, inngest } from "@/inngest/client";

/**
 * Daily at 08:00 UTC: find active campaigns and queue one discovery job per
 * campaign. Mirrors discoverAllActiveCampaigns(), but fans out instead of
 * looping in a single request.
 */
export const scheduleCampaignDiscovery = inngest.createFunction(
  {
    id: "schedule-campaign-discovery",
    triggers: [cron("0 8 * * *")],
  },
  async ({ step }) => {
    const campaigns = await step.run("load-active-campaigns", () =>
      prisma.campaign.findMany({
        where: { isActive: true },
        select: { id: true, userId: true },
      }),
    );

    if (campaigns.length === 0) {
      return { queued: 0 };
    }

    // Event ids are deduplicated by Inngest, so a re-run on the same day
    // does not queue a campaign twice.
    const day = new Date().toISOString().slice(0, 10);
    await step.sendEvent(
      "queue-campaign-discovery",
      campaigns.map((campaign) =>
        campaignDiscoverRequested.create(
          { campaignId: campaign.id, userId: campaign.userId },
          { id: `discover-${campaign.id}-${day}` },
        ),
      ),
    );

    return { queued: campaigns.length };
  },
);

/** Runs discovery for one campaign, with retries and limited concurrency. */
export const discoverCampaign = inngest.createFunction(
  {
    id: "discover-campaign",
    triggers: [campaignDiscoverRequested],
    retries: 3,
    // Keep provider (RocketReach) load bounded.
    concurrency: { limit: 2 },
  },
  async ({ event, step }) => {
    const { campaignId, userId } = event.data;

    return step.run("discover", async () => {
      try {
        return await discoverForCampaign(userId, campaignId);
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        // Campaign deleted or paused since it was queued: retrying won't help.
        if (message === "Campaign not found." || message === "Campaign is paused.") {
          throw new NonRetriableError(message);
        }
        throw error;
      }
    });
  },
);

export const discoverFunctions = [scheduleCampaignDiscovery, discoverCampaign];
