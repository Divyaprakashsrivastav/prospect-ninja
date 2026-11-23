import type { LeadReplyStatusValue } from "@prisma/client";

/** Inbox reply status, stored in the LeadReplyStatus table. */
export type InboxStatus = LeadReplyStatusValue;

/** Safe to import from client components (no Prisma runtime). */
export const INBOX_STATUSES = ["interested", "not_now", "meeting_booked"] as const satisfies readonly InboxStatus[];

export const INBOX_STATUS_LABELS: Record<InboxStatus, string> = {
  interested: "Interested",
  not_now: "Not now",
  meeting_booked: "Meeting booked",
};

export function isInboxStatus(value: unknown): value is InboxStatus {
  return typeof value === "string" && (INBOX_STATUSES as readonly string[]).includes(value);
}
