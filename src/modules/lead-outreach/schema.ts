import { z } from "zod";
import {
  LEAD_MESSAGE_TYPES,
  LEAD_OUTREACH_STATUS,
} from "@/modules/lead-outreach/constants";

export const leadMessageTypeSchema = z.enum(LEAD_MESSAGE_TYPES);

export const generateLeadOutreachSchema = z.object({
  messageType: leadMessageTypeSchema.default("professional"),
  campaignContext: z.string().trim().max(2000).default(""),
  replaceExisting: z.boolean().optional().default(false),
});

export const editLeadOutreachSchema = z.object({
  body: z.string().trim().min(10).max(2000),
});

export const leadOutreachStatusSchema = z.object({
  status: z.enum([
    LEAD_OUTREACH_STATUS.approved,
    LEAD_OUTREACH_STATUS.rejected,
    LEAD_OUTREACH_STATUS.sent,
    LEAD_OUTREACH_STATUS.replied,
    LEAD_OUTREACH_STATUS.draft,
  ]),
});

export const bulkGenerateLeadOutreachSchema = z.object({
  leadIds: z.array(z.string().trim().min(1)).min(1).max(50),
  messageType: leadMessageTypeSchema.default("professional"),
  campaignContext: z.string().trim().max(2000).default(""),
});
