import { z } from "zod";

const stringList = z
  .array(z.string().trim().min(1).max(120))
  .max(40)
  .default([]);

export const icpSchema = z.object({
  jobTitles: stringList,
  industries: stringList,
  locations: stringList,
  companySizeMin: z.number().int().min(1).optional(),
  companySizeMax: z.number().int().min(1).optional(),
  keywords: stringList,
  exclusions: stringList,
});

export type Icp = z.infer<typeof icpSchema>;

export const campaignInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  isActive: z.boolean().default(true),
  dailyDiscoverLimit: z.number().int().min(1).max(15).default(15),
  icp: icpSchema,
});

export type CampaignInput = z.infer<typeof campaignInputSchema>;

export function parseIcp(value: unknown): Icp {
  return icpSchema.parse(value);
}
