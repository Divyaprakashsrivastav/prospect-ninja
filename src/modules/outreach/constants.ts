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

export const GENERATION_STATUS = {
  pending: "pending",
  completed: "completed",
  failed: "failed",
  demo: "demo",
} as const;

export function draftGenerationLabel(message?: {
  generationStatus?: string | null;
  aiProvider?: string | null;
  body?: string | null;
  originalBody?: string | null;
} | null): { key: string; label: string } {
  if (!message) {
    return { key: "none", label: "None" };
  }
  if (
    message.originalBody &&
    message.body &&
    message.body !== message.originalBody
  ) {
    return { key: "edited", label: "Edited" };
  }
  if (
    message.generationStatus === GENERATION_STATUS.demo ||
    message.aiProvider === "demo"
  ) {
    return { key: "demo", label: "DEMO OUTPUT" };
  }
  if (message.generationStatus === GENERATION_STATUS.failed) {
    return { key: "failed", label: "Failed" };
  }
  if (message.generationStatus === GENERATION_STATUS.pending) {
    return { key: "pending_review", label: "Generating" };
  }
  return { key: "completed", label: "Generated" };
}

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
