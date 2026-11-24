import { eventType, Inngest, staticSchema } from "inngest";

export const inngest = new Inngest({ id: "prospect-ninja" });

/** Requests a discovery run for a single campaign. */
export const campaignDiscoverRequested = eventType(
  "campaign/discover.requested",
  {
    schema: staticSchema<{ campaignId: string }>(),
  },
);
