import { z } from "zod";

export const LEAD_STATUSES = [
  "new",
  "contacted",
  "interested",
  "qualified",
  "not_interested",
  "converted",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  interested: "Interested",
  qualified: "Qualified",
  not_interested: "Not Interested",
  converted: "Converted",
};

export const LEAD_SOURCES = [
  "manual",
  "csv",
  "referral",
  "website",
  "linkedin",
  "other",
] as const;

export const leadStatusSchema = z.enum(LEAD_STATUSES);

const optionalText = z
  .string()
  .trim()
  .max(500)
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));

const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined))
  .refine(
    (value) => !value || /^https?:\/\//i.test(value) || value.startsWith("/"),
    "URL must start with http:// or https://",
  );

const optionalEmail = z
  .string()
  .trim()
  .max(320)
  .optional()
  .transform((value) => (value && value.length > 0 ? value.toLowerCase() : undefined))
  .refine(
    (value) => !value || z.string().email().safeParse(value).success,
    "Enter a valid email address.",
  );

export const leadInputSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required.").max(80),
  lastName: z.string().trim().min(1, "Last name is required.").max(80),
  jobTitle: z.string().trim().max(120).default(""),
  company: z.string().trim().max(160).default(""),
  email: optionalEmail,
  phone: optionalText,
  linkedinUrl: optionalUrl,
  website: optionalUrl,
  industry: z.string().trim().max(120).default(""),
  location: z.string().trim().max(160).default(""),
  companySize: z.string().trim().max(40).default(""),
  source: z.string().trim().min(1).max(80).default("manual"),
  status: leadStatusSchema.default("new"),
  notes: z.string().trim().max(5000).default(""),
});

export type LeadInput = z.infer<typeof leadInputSchema>;

export const leadStatusUpdateSchema = z.object({
  status: leadStatusSchema,
});

export const leadBulkDeleteSchema = z.object({
  ids: z.array(z.string().trim().min(1)).min(1).max(200),
});

const emptyToUndefined = (value: unknown) =>
  value === "" || value == null ? undefined : value;

export const leadListQuerySchema = z.object({
  q: z.preprocess(emptyToUndefined, z.string().trim().max(200).optional()),
  status: z.preprocess(emptyToUndefined, leadStatusSchema.optional()),
  industry: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(120).optional(),
  ),
  company: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(160).optional(),
  ),
  sort: z.preprocess(
    (value) => emptyToUndefined(value) ?? "createdAt",
    z.enum(["name", "company", "createdAt"]),
  ),
  order: z.preprocess(
    (value) => emptyToUndefined(value) ?? "desc",
    z.enum(["asc", "desc"]),
  ),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export type LeadListQuery = z.infer<typeof leadListQuerySchema>;

export function leadFullName(lead: { firstName: string; lastName: string }) {
  return `${lead.firstName} ${lead.lastName}`.trim();
}
