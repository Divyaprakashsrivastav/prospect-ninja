export const MESSAGE_STATUS = {
  draft: "draft",
  pendingReview: "pending_review",
  approved: "approved",
  rejected: "rejected",
  demoRecorded: "demo_recorded",
  sent: "sent",
  failed: "failed",
} as const;

export type MessageStatus =
  (typeof MESSAGE_STATUS)[keyof typeof MESSAGE_STATUS];

export const AUDIT_ACTION = {
  generated: "generated",
  edited: "edited",
  approved: "approved",
  rejected: "rejected",
  sendAttempted: "send_attempted",
  sendSucceeded: "send_succeeded",
  sendFailed: "send_failed",
  demoSend: "demo_send",
} as const;
