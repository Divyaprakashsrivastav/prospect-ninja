export const LEAD_OUTREACH_STATUS = {
  draft: "draft",
  approved: "approved",
  rejected: "rejected",
  sent: "sent",
  replied: "replied",
} as const;

export type LeadOutreachStatus =
  (typeof LEAD_OUTREACH_STATUS)[keyof typeof LEAD_OUTREACH_STATUS];

export const LEAD_OUTREACH_STATUS_LABELS: Record<LeadOutreachStatus, string> = {
  draft: "Draft",
  approved: "Approved",
  rejected: "Rejected",
  sent: "Sent",
  replied: "Replied",
};

export const LEAD_MESSAGE_TYPES = [
  "connection_request",
  "follow_up",
  "professional",
] as const;

export type LeadMessageType = (typeof LEAD_MESSAGE_TYPES)[number];

export const LEAD_MESSAGE_TYPE_LABELS: Record<LeadMessageType, string> = {
  connection_request: "LinkedIn connection request",
  follow_up: "LinkedIn follow-up",
  professional: "Professional outreach",
};

export const LEAD_OUTREACH_GENERATION = {
  pending: "pending",
  completed: "completed",
  failed: "failed",
  demo: "demo",
} as const;

export const LEAD_OUTREACH_ACTION = {
  generated: "generated",
  edited: "edited",
  approved: "approved",
  rejected: "rejected",
  marked_sent: "marked_sent",
  marked_replied: "marked_replied",
} as const;

const LOCKED = new Set<string>([
  LEAD_OUTREACH_STATUS.approved,
  LEAD_OUTREACH_STATUS.sent,
  LEAD_OUTREACH_STATUS.replied,
]);

export function isLeadOutreachLocked(status: string): boolean {
  return LOCKED.has(status);
}
