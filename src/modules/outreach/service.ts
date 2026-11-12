import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { hashBody } from "@/lib/crypto";
import { getAiProvider } from "@/modules/ai";
import { usableProductDescription } from "@/modules/ai/facts";
import { parseIcp } from "@/modules/campaigns/schema";
import { getActiveProvider } from "@/modules/integrations/service";
import {
  AUDIT_ACTION,
  GENERATION_STATUS,
  MESSAGE_STATUS,
} from "@/modules/outreach/constants";
import { z } from "zod";

const editSchema = z.object({
  body: z.string().trim().min(10).max(2000),
});

async function writeAudit(input: {
  messageId: string;
  actorUserId: string;
  action: string;
  bodySnapshot: string;
  metadata?: Prisma.InputJsonValue;
}) {
  await prisma.messageAuditEvent.create({
    data: {
      messageId: input.messageId,
      actorUserId: input.actorUserId,
      action: input.action,
      bodySnapshot: input.bodySnapshot,
      metadata: input.metadata,
    },
  });
}

const PROTECTED_STATUSES = new Set<string>([
  MESSAGE_STATUS.approved,
  MESSAGE_STATUS.rejected,
  MESSAGE_STATUS.sent,
  MESSAGE_STATUS.demoRecorded,
]);

function isUserEdited(message: {
  body: string;
  originalBody: string | null;
  status: string;
}): boolean {
  if (PROTECTED_STATUSES.has(message.status)) {
    return true;
  }
  return Boolean(message.originalBody && message.body !== message.originalBody);
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function generateDraftForProspect(
  userId: string,
  prospectId: string,
  options: { replaceExisting?: boolean } = {},
) {
  const prospect = await prisma.prospect.findFirst({
    where: { id: prospectId, userId },
    include: { campaign: true, messages: true },
  });
  if (!prospect) {
    throw new Error("Prospect not found.");
  }

  const existing = prospect.messages[0];
  if (existing && isUserEdited(existing)) {
    throw new Error(
      "Existing edited or approved draft was not overwritten.",
    );
  }
  if (existing && !options.replaceExisting) {
    throw new Error(
      "Confirm replacement of the existing draft before regenerating.",
    );
  }

  const icp = parseIcp(prospect.campaign.icp);
  if (!usableProductDescription(icp.productService)) {
    throw new Error(
      "Configure a real product or service description on the campaign before generating outreach. Placeholder or test copy cannot be used.",
    );
  }
  const provider = getAiProvider();
  const draft = await provider.generate({
    senderName: icp.senderName,
    firstName: prospect.firstName,
    lastName: prospect.lastName,
    prospectName: prospect.fullName,
    jobTitle: prospect.jobTitle,
    headline: prospect.headline,
    companyName: prospect.companyName,
    companySize: prospect.companySize,
    location: prospect.location,
    industry: prospect.industry,
    summary: prospect.summary,
    campaignName: prospect.campaign.name,
    campaignDescription: prospect.campaign.description,
    icpTitles: icp.jobTitles,
    icpIndustries: icp.industries,
    icpLocations: icp.locations,
    productService: icp.productService,
    outreachObjective: icp.outreachObjective,
    tone: icp.tone,
  });

  const payload = {
    body: draft.message,
    originalBody: draft.message,
    personalizationReason: draft.personalizationReason,
    personalizationEvidence: draft.personalizationEvidence,
    aiProvider: draft.provider,
    aiModel: draft.model,
    generationStatus: draft.demo
      ? GENERATION_STATUS.demo
      : GENERATION_STATUS.completed,
    confidence: draft.confidence,
    status: MESSAGE_STATUS.draft,
    approvedAt: null,
    approvedBodyHash: null,
  };

  if (existing) {
    const updated = await prisma.outreachMessage.update({
      where: { id: existing.id },
      data: payload,
    });
    await writeAudit({
      messageId: updated.id,
      actorUserId: userId,
      action: AUDIT_ACTION.generated,
      bodySnapshot: draft.message,
      metadata: { provider: draft.provider, model: draft.model, regenerated: true },
    });
    return updated;
  }

  const created = await prisma.outreachMessage.create({
    data: {
      prospectId: prospect.id,
      campaignId: prospect.campaignId,
      ...payload,
    },
  });
  await writeAudit({
    messageId: created.id,
    actorUserId: userId,
    action: AUDIT_ACTION.generated,
    bodySnapshot: draft.message,
    metadata: { provider: draft.provider, model: draft.model },
  });
  return created;
}

export async function generateDraftsForCampaign(
  userId: string,
  campaignId: string,
) {
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, userId },
  });
  if (!campaign) {
    throw new Error("Campaign not found.");
  }

  const prospects = await prisma.prospect.findMany({
    where: { userId, campaignId },
    include: { messages: true },
    orderBy: { discoveredAt: "asc" },
  });

  const results: Array<{
    prospectId: string;
    status: "succeeded" | "failed" | "skipped";
    error?: string;
    messageId?: string;
  }> = [];

  const provider = getAiProvider();
  const throttleMs = provider.id === "openai" ? 350 : 0;

  for (const prospect of prospects) {
    const existing = prospect.messages[0];
    if (existing) {
      results.push({ prospectId: prospect.id, status: "skipped" });
      continue;
    }
    try {
      const message = await generateDraftForProspect(userId, prospect.id);
      results.push({
        prospectId: prospect.id,
        status: "succeeded",
        messageId: message.id,
      });
    } catch (error) {
      results.push({
        prospectId: prospect.id,
        status: "failed",
        error: error instanceof Error ? error.message : "Generation failed",
      });
    }
    if (throttleMs > 0) {
      await delay(throttleMs);
    }
  }

  return {
    succeeded: results.filter((item) => item.status === "succeeded").length,
    failed: results.filter((item) => item.status === "failed").length,
    skipped: results.filter((item) => item.status === "skipped").length,
    results,
  };
}

export async function listApprovalQueue(userId: string) {
  return prisma.outreachMessage.findMany({
    where: {
      campaign: { userId },
      status: {
        in: [
          MESSAGE_STATUS.draft,
          MESSAGE_STATUS.pendingReview,
          MESSAGE_STATUS.approved,
          MESSAGE_STATUS.rejected,
        ],
      },
    },
    include: {
      prospect: true,
      campaign: { select: { name: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getMessage(userId: string, id: string) {
  return prisma.outreachMessage.findFirst({
    where: { id, campaign: { userId } },
    include: {
      prospect: true,
      campaign: true,
      auditEvents: {
        orderBy: { createdAt: "desc" },
        include: { actor: { select: { name: true, email: true } } },
      },
    },
  });
}

export async function editMessage(userId: string, id: string, body: string) {
  const parsed = editSchema.parse({ body });
  const message = await getMessage(userId, id);
  if (!message) {
    throw new Error("Message not found.");
  }
  if (
    message.status === MESSAGE_STATUS.sent ||
    message.status === MESSAGE_STATUS.demoRecorded
  ) {
    throw new Error("Sent or recorded messages cannot be edited.");
  }
  const updated = await prisma.outreachMessage.update({
    where: { id },
    data: {
      body: parsed.body,
      status: MESSAGE_STATUS.pendingReview,
      approvedAt: null,
      approvedBodyHash: null,
    },
  });
  await writeAudit({
    messageId: id,
    actorUserId: userId,
    action: AUDIT_ACTION.edited,
    bodySnapshot: parsed.body,
  });
  return updated;
}

export async function approveMessage(userId: string, id: string) {
  const message = await getMessage(userId, id);
  if (!message) {
    throw new Error("Message not found.");
  }
  if (message.status === MESSAGE_STATUS.rejected) {
    throw new Error("Rejected messages cannot be approved. Edit first.");
  }
  if (
    message.status === MESSAGE_STATUS.sent ||
    message.status === MESSAGE_STATUS.demoRecorded
  ) {
    throw new Error("This message was already processed.");
  }
  const updated = await prisma.outreachMessage.update({
    where: { id },
    data: {
      status: MESSAGE_STATUS.approved,
      approvedAt: new Date(),
      approvedBodyHash: hashBody(message.body),
    },
  });
  await writeAudit({
    messageId: id,
    actorUserId: userId,
    action: AUDIT_ACTION.approved,
    bodySnapshot: message.body,
  });
  return updated;
}

export async function rejectMessage(userId: string, id: string) {
  const message = await getMessage(userId, id);
  if (!message) {
    throw new Error("Message not found.");
  }
  if (
    message.status === MESSAGE_STATUS.sent ||
    message.status === MESSAGE_STATUS.demoRecorded
  ) {
    throw new Error("This message was already processed.");
  }
  const updated = await prisma.outreachMessage.update({
    where: { id },
    data: {
      status: MESSAGE_STATUS.rejected,
      approvedAt: null,
      approvedBodyHash: null,
    },
  });
  await writeAudit({
    messageId: id,
    actorUserId: userId,
    action: AUDIT_ACTION.rejected,
    bodySnapshot: message.body,
  });
  return updated;
}

export async function sendMessage(userId: string, id: string) {
  const message = await getMessage(userId, id);
  if (!message) {
    throw new Error("Message not found.");
  }

  const approved =
    message.status === MESSAGE_STATUS.approved &&
    Boolean(message.approvedAt) &&
    message.approvedBodyHash === hashBody(message.body);

  await writeAudit({
    messageId: id,
    actorUserId: userId,
    action: AUDIT_ACTION.sendAttempted,
    bodySnapshot: message.body,
    metadata: { approved },
  });

  if (!approved) {
    throw new Error(
      "Message must be explicitly approved before sending. Edits require a new approval.",
    );
  }

  const provider = await getActiveProvider(userId);
  const result = await provider.sendMessage({
    prospect: {
      provider: message.prospect.provider as "demo" | "heyreach",
      externalId: message.prospect.externalId,
      linkedinUrl: message.prospect.linkedinUrl,
      fullName: message.prospect.fullName,
      headline: message.prospect.headline ?? undefined,
      companyName: message.prospect.companyName ?? undefined,
      location: message.prospect.location ?? undefined,
      industry: message.prospect.industry ?? undefined,
      rawProfile: (message.prospect.rawProfile ?? {}) as Record<
        string,
        string | number | undefined
      >,
    },
    body: message.body,
  });

  if (!result.ok) {
    const failed = await prisma.outreachMessage.update({
      where: { id },
      data: { status: MESSAGE_STATUS.failed },
    });
    await writeAudit({
      messageId: id,
      actorUserId: userId,
      action: AUDIT_ACTION.sendFailed,
      bodySnapshot: message.body,
      metadata: { error: result.error },
    });
    return failed;
  }

  if (result.simulated || provider.id === "demo") {
    const recorded = await prisma.outreachMessage.update({
      where: { id },
      data: {
        status: MESSAGE_STATUS.demoRecorded,
        sentAt: new Date(),
      },
    });
    await writeAudit({
      messageId: id,
      actorUserId: userId,
      action: AUDIT_ACTION.demoSend,
      bodySnapshot: message.body,
      metadata: {
        provider: provider.id,
        note: "Not sent — demo provider",
      },
    });
    return recorded;
  }

  const sent = await prisma.outreachMessage.update({
    where: { id },
    data: {
      status: MESSAGE_STATUS.sent,
      sentAt: new Date(),
    },
  });
  await writeAudit({
    messageId: id,
    actorUserId: userId,
    action: AUDIT_ACTION.sendSucceeded,
    bodySnapshot: message.body,
    metadata: { provider: provider.id, providerMessageId: result.providerMessageId },
  });
  return sent;
}

export async function listHistory(userId: string) {
  return prisma.outreachMessage.findMany({
    where: {
      campaign: { userId },
      status: {
        in: [
          MESSAGE_STATUS.demoRecorded,
          MESSAGE_STATUS.sent,
          MESSAGE_STATUS.failed,
        ],
      },
    },
    include: {
      prospect: true,
      campaign: { select: { name: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}
