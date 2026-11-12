import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { hashBody } from "@/lib/crypto";
import { getMessageGenerator } from "@/modules/ai";
import { parseIcp } from "@/modules/campaigns/schema";
import { getActiveProvider } from "@/modules/integrations/service";
import { AUDIT_ACTION, MESSAGE_STATUS } from "@/modules/outreach/constants";
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

export async function generateDraftForProspect(
  userId: string,
  prospectId: string,
) {
  const prospect = await prisma.prospect.findFirst({
    where: { id: prospectId, userId },
    include: { campaign: true, messages: true },
  });
  if (!prospect) {
    throw new Error("Prospect not found.");
  }
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const icp = parseIcp(prospect.campaign.icp);
  const generator = getMessageGenerator();
  const draft = await generator.generateDraft({
    senderName: user.name,
    prospectName: prospect.fullName,
    headline: prospect.headline,
    companyName: prospect.companyName,
    location: prospect.location,
    industry: prospect.industry,
    campaignName: prospect.campaign.name,
    icpTitles: icp.jobTitles,
    productService: icp.productService,
    outreachObjective: icp.outreachObjective,
    tone: icp.tone,
  });

  const existing = prospect.messages[0];
  if (existing) {
    const updated = await prisma.outreachMessage.update({
      where: { id: existing.id },
      data: {
        body: draft.body,
        status: MESSAGE_STATUS.pendingReview,
        approvedAt: null,
        approvedBodyHash: null,
      },
    });
    await writeAudit({
      messageId: updated.id,
      actorUserId: userId,
      action: AUDIT_ACTION.generated,
      bodySnapshot: draft.body,
      metadata: { source: draft.source, regenerated: true },
    });
    return updated;
  }

  const created = await prisma.outreachMessage.create({
    data: {
      prospectId: prospect.id,
      campaignId: prospect.campaignId,
      status: MESSAGE_STATUS.pendingReview,
      body: draft.body,
    },
  });
  await writeAudit({
    messageId: created.id,
    actorUserId: userId,
    action: AUDIT_ACTION.generated,
    bodySnapshot: draft.body,
    metadata: { source: draft.source },
  });
  return created;
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
