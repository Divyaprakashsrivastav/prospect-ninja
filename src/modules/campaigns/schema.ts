import { z } from "zod";

const stringList = z
  .array(z.string().trim().min(1).max(120))
  .max(40)
  .default([]);

const requiredList = z
  .array(z.string().trim().min(1).max(120))
  .min(1, "Add at least one value.")
  .max(40);

export const COMPANY_SIZES = [
  { id: "1-10", label: "1–10", min: 1, max: 10 },
  { id: "11-50", label: "11–50", min: 11, max: 50 },
  { id: "51-200", label: "51–200", min: 51, max: 200 },
  { id: "201-500", label: "201–500", min: 201, max: 500 },
  { id: "501+", label: "501+", min: 501, max: undefined },
] as const;

export const MESSAGE_TONES = [
  "professional",
  "friendly",
  "conversational",
  "direct",
] as const;

export const companySizeSchema = z.enum([
  "1-10",
  "11-50",
  "51-200",
  "201-500",
  "501+",
]);

export const toneSchema = z.enum(MESSAGE_TONES);

export const DAILY_PROSPECT_LIMIT = 15;

export const icpSchema = z.object({
  jobTitles: stringList,
  industries: stringList,
  locations: stringList,
  companySize: companySizeSchema.optional(),
  companySizeMin: z.number().int().min(1).optional(),
  companySizeMax: z.number().int().min(1).optional(),
  keywords: stringList,
  exclusions: stringList,
  productService: z.string().trim().max(2000).default(""),
  outreachObjective: z.string().trim().max(500).default(""),
  tone: toneSchema.default("professional"),
});

export type Icp = z.infer<typeof icpSchema>;

export const campaignInputSchema = z.object({
  name: z.string().trim().min(2, "Campaign name is required.").max(120),
  description: z
    .string()
    .trim()
    .min(10, "Add a short campaign description.")
    .max(1000),
  isActive: z.boolean().default(true),
  dailyDiscoverLimit: z.coerce
    .number()
    .transform((value) => clampDailyLimit(value))
    .default(DAILY_PROSPECT_LIMIT),
  icp: z.object({
    jobTitles: requiredList,
    industries: requiredList,
    locations: requiredList,
    companySize: companySizeSchema,
    keywords: stringList,
    exclusions: stringList,
    productService: z
      .string()
      .trim()
      .min(10, "Describe the product or service.")
      .max(2000),
    outreachObjective: z
      .string()
      .trim()
      .min(5, "Describe the outreach objective.")
      .max(500),
    tone: toneSchema,
  }),
});

export type CampaignInput = z.infer<typeof campaignInputSchema>;

export const campaignStatusSchema = z.object({
  isActive: z.boolean(),
});

export function companySizeBounds(size: z.infer<typeof companySizeSchema>): {
  companySizeMin?: number;
  companySizeMax?: number;
} {
  const match = COMPANY_SIZES.find((item) => item.id === size);
  return {
    companySizeMin: match?.min,
    companySizeMax: match?.max,
  };
}

export function parseIcp(value: unknown): Icp {
  return icpSchema.parse(value ?? {});
}

export function clampDailyLimit(value: number | undefined): number {
  if (!value || Number.isNaN(value)) {
    return DAILY_PROSPECT_LIMIT;
  }
  return Math.min(Math.max(Math.trunc(value), 1), DAILY_PROSPECT_LIMIT);
}
