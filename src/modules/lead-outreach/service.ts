import { Prisma } from "@prisma/client";
import { hashBody } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { assertOwned } from "@/lib/ownership";
import { getAiProvider } from "@/modules/ai";
import { leadFullName } from "@/modules/leads/schema";
import { getLead } from "@/modules/leads/service";
import {
  LEAD_OUTREACH_ACTION,
  LEAD_OUTREACH_GENERATION,
  LEAD_OUTREACH_STATUS,
  isLeadOutreachLocked,
  type LeadMessageType,
} from "@/modules/lead-outreach/constants";
import {
  bulkGenerateLeadOutreachSchema,
  editLeadOutreachSchema,
  generateLeadOutreachSchema,
} from "@/modules/lead-outreach/schema";

async function writeEvent(input: {
  outreachId: string;
  actorUserId: string;
  action: string;
  bodySnapshot: string;
  metadata?: Prisma.InputJsonValue;
}) {
  await prisma.leadOutreachEvent.create({
    data: {
      outreachId: input.outreachId,
      actorUserId: input.actorUserId,
      action: input.action,
      bodySnapshot: input.bodySnapshot,
      metadata: input.metadata,
    },
  });
}

function isEdited(outreach: {
  body: string;
  originalBody: string | null;
  status: string;
}): boolean {
  if (isLeadOutreachLocked(outreach.status)) {
    return true;
  }
  if (outreach.status === LEAD_OUTREACH_STATUS.rejected) {
    return true;
  }
  return Boolean(
    outreach.originalBody && outreach.body !== outreach.originalBody,
  );
}

export async function listLeadOutreaches(userId: string, leadId: string) {
  assertOwned(await getLead(userId, leadId), "Lead not found.");
  return prisma.leadOutreach.findMany({
    where: { userId, leadId },
    orderBy: { updatedAt: "desc" },
    include: {
      events: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
}

export async function getLeadOutreach(userId: string, id: string) {
  return prisma.leadOutreach.findFirst({
    where: { id, userId },
    include: {
      lead: true,
      events: {
        orderBy: { createdAt: "desc" },
        take: 40,
        include: { actor: { select: { name: true, email: true } } },
      },
    },
  });
}

export async function listWorkspaceOutreaches(
  userId: string,
  options: { status?: string; page?: number; pageSize?: number } = {},
) {
  const page = Math.max(options.page ?? 1, 1);
  const pageSize = Math.min(Math.max(options.pageSize ?? 20, 1), 50);
  const where: Prisma.LeadOutreachWhereInput = {
    userId,
    ...(options.status ? { status: options.status } : {}),
  };
  const [total, outreaches] = await Promise.all([
    prisma.leadOutreach.count({ where }),
    prisma.leadOutreach.findMany({
      where,
      include: {
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            company: true,
            jobTitle: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return {
    outreaches,
    total,
    page,
    pageSize,
    pageCount: Math.max(Math.ceil(total / pageSize), 1),
  };
}

export async function getLeadOutreachStats(userId: string) {
  const [draft, approved, sent, replied] = await Promise.all([
    prisma.leadOutreach.count({
      where: { userId, status: LEAD_OUTREACH_STATUS.draft },
    }),
    prisma.leadOutreach.count({
      where: { userId, status: LEAD_OUTREACH_STATUS.approved },
    }),
    prisma.leadOutreach.count({
      where: { userId, status: LEAD_OUTREACH_STATUS.sent },
    }),
    prisma.leadOutreach.count({
      where: { userId, status: LEAD_OUTREACH_STATUS.replied },
    }),
  ]);
  return { draft, approved, sent, replied, total: draft + approved + sent + replied };
}

export async function generateLeadOutreach(
  userId: string,
  leadId: string,
  rawInput: unknown = {},
) {
  const input = generateLeadOutreachSchema.parse(rawInput);
  const lead = assertOwned(await getLead(userId, leadId), "Lead not found.");
  const messageType = input.messageType as LeadMessageType;

  const existing = await prisma.leadOutreach.findUnique({
    where: {
      leadId_messageType: { leadId, messageType },
    },
  });

  if (existing && isEdited(existing)) {
    throw new Error(
      "Existing edited or approved outreach was not overwritten.",
    );
  }
  if (existing && !input.replaceExisting) {
    throw new Error(
      "Confirm replacement of the existing draft before regenerating.",
    );
  }
  if (
    existing &&
    (existing.status === LEAD_OUTREACH_STATUS.sent ||
      existing.status === LEAD_OUTREACH_STATUS.replied)
  ) {
    throw new Error(
      "Sent or replied outreach cannot be regenerated. Choose another message type.",
    );
  }

  const campaignContext = input.campaignContext.trim();
  const provider = getAiProvider();
  const draft = await provider.generate({
    firstName: lead.firstName,
    lastName: lead.lastName,
    prospectName: leadFullName(lead),
    jobTitle: lead.jobTitle || null,
    companyName: lead.company || null,
    companySize: lead.companySize || null,
    location: lead.location || null,
    industry: lead.industry || null,
    summary: lead.notes || null,
    website: lead.website || null,
    campaignName: "Lead outreach",
    campaignDescription: campaignContext || undefined,
    campaignContext: campaignContext || undefined,
    messageType,
    icpTitles: lead.jobTitle ? [lead.jobTitle] : [],
    icpIndustries: lead.industry ? [lead.industry] : [],
    icpLocations: lead.location ? [lead.location] : [],
    productService: campaignContext || undefined,
    outreachObjective: campaignContext || undefined,
    tone: "professional",
  });

  const payload = {
    body: draft.message,
    originalBody: draft.message,
    campaignContext,
    personalizationReason: draft.personalizationReason,
    personalizationEvidence: draft.personalizationEvidence,
    aiProvider: draft.provider,
    aiModel: draft.model,
    generationStatus: draft.demo
      ? LEAD_OUTREACH_GENERATION.demo
      : LEAD_OUTREACH_GENERATION.completed,
    confidence: draft.confidence,
    status: LEAD_OUTREACH_STATUS.draft,
    approvedAt: null,
    approvedBodyHash: null,
  };

  if (existing) {
    const updated = await prisma.leadOutreach.update({
      where: { id: existing.id },
      data: payload,
    });
    await writeEvent({
      outreachId: updated.id,
      actorUserId: userId,
      action: LEAD_OUTREACH_ACTION.generated,
      bodySnapshot: draft.message,
      metadata: {
        provider: draft.provider,
        model: draft.model,
        demo: draft.demo,
        regenerated: true,
        messageType,
      },
    });
    return updated;
  }

  const created = await prisma.leadOutreach.create({
    data: {
      userId,
      leadId,
      messageType,
      ...payload,
    },
  });
  await writeEvent({
    outreachId: created.id,
    actorUserId: userId,
    action: LEAD_OUTREACH_ACTION.generated,
    bodySnapshot: draft.message,
    metadata: {
      provider: draft.provider,
      model: draft.model,
      demo: draft.demo,
      messageType,
    },
  });
  return created;
}

export async function bulkGenerateLeadOutreach(userId: string, rawInput: unknown) {
  const input = bulkGenerateLeadOutreachSchema.parse(rawInput);
  const results: Array<{
    leadId: string;
    status: "succeeded" | "failed" | "skipped";
    error?: string;
    outreachId?: string;
  }> = [];

  for (const leadId of input.leadIds) {
    const existing = await prisma.leadOutreach.findUnique({
      where: {
        leadId_messageType: {
          leadId,
          messageType: input.messageType,
        },
      },
    });
    if (existing) {
      results.push({ leadId, status: "skipped" });
      continue;
    }
    try {
      const outreach = await generateLeadOutreach(userId, leadId, {
        messageType: input.messageType,
        campaignContext: input.campaignContext,
        replaceExisting: false,
      });
      results.push({
        leadId,
        status: "succeeded",
        outreachId: outreach.id,
      });
    } catch (error) {
      results.push({
        leadId,
        status: "failed",
        error: error instanceof Error ? error.message : "Generation failed",
      });
    }
  }

  return {
    succeeded: results.filter((item) => item.status === "succeeded").length,
    failed: results.filter((item) => item.status === "failed").length,
    skipped: results.filter((item) => item.status === "skipped").length,
    results,
  };
}

export async function editLeadOutreach(
  userId: string,
  id: string,
  rawInput: unknown,
) {
  const outreach = assertOwned(await getLeadOutreach(userId, id), "Outreach not found.");
  if (
    outreach.status === LEAD_OUTREACH_STATUS.sent ||
    outreach.status === LEAD_OUTREACH_STATUS.replied
  ) {
    throw new Error("Sent or replied outreach cannot be edited.");
  }
  const { body } = editLeadOutreachSchema.parse(rawInput);
  const updated = await prisma.leadOutreach.update({
    where: { id },
    data: {
      body,
      status: LEAD_OUTREACH_STATUS.draft,
      approvedAt: null,
      approvedBodyHash: null,
    },
  });
  await writeEvent({
    outreachId: id,
    actorUserId: userId,
    action: LEAD_OUTREACH_ACTION.edited,
    bodySnapshot: body,
  });
  return updated;
}

export async function approveLeadOutreach(userId: string, id: string) {
  const outreach = assertOwned(await getLeadOutreach(userId, id), "Outreach not found.");
  if (outreach.status === LEAD_OUTREACH_STATUS.rejected) {
    throw new Error("Rejected outreach cannot be approved. Edit or regenerate first.");
  }
  if (
    outreach.status === LEAD_OUTREACH_STATUS.sent ||
    outreach.status === LEAD_OUTREACH_STATUS.replied
  ) {
    throw new Error("This outreach was already finalized.");
  }
  const updated = await prisma.leadOutreach.update({
    where: { id },
    data: {
      status: LEAD_OUTREACH_STATUS.approved,
      approvedAt: new Date(),
      approvedBodyHash: hashBody(outreach.body),
    },
  });
  await writeEvent({
    outreachId: id,
    actorUserId: userId,
    action: LEAD_OUTREACH_ACTION.approved,
    bodySnapshot: outreach.body,
  });
  return updated;
}

export async function rejectLeadOutreach(userId: string, id: string) {
  const outreach = assertOwned(await getLeadOutreach(userId, id), "Outreach not found.");
  if (
    outreach.status === LEAD_OUTREACH_STATUS.sent ||
    outreach.status === LEAD_OUTREACH_STATUS.replied
  ) {
    throw new Error("This outreach was already finalized.");
  }
  const updated = await prisma.leadOutreach.update({
    where: { id },
    data: {
      status: LEAD_OUTREACH_STATUS.rejected,
      approvedAt: null,
      approvedBodyHash: null,
    },
  });
  await writeEvent({
    outreachId: id,
    actorUserId: userId,
    action: LEAD_OUTREACH_ACTION.rejected,
    bodySnapshot: outreach.body,
  });
  return updated;
}

/** Manual tracking only — does not send to LinkedIn. */
export async function markLeadOutreachSent(userId: string, id: string) {
  const outreach = assertOwned(await getLeadOutreach(userId, id), "Outreach not found.");
  const approved =
    outreach.status === LEAD_OUTREACH_STATUS.approved &&
    Boolean(outreach.approvedAt) &&
    outreach.approvedBodyHash === hashBody(outreach.body);
  if (!approved) {
    throw new Error(
      "Mark as sent requires an approved body that has not been edited since approval. This app does not send to LinkedIn.",
    );
  }
  const updated = await prisma.leadOutreach.update({
    where: { id },
    data: { status: LEAD_OUTREACH_STATUS.sent },
  });
  await writeEvent({
    outreachId: id,
    actorUserId: userId,
    action: LEAD_OUTREACH_ACTION.marked_sent,
    bodySnapshot: outreach.body,
    metadata: { note: "Manual status only — not sent via LinkedIn API" },
  });
  return updated;
}

export async function markLeadOutreachReplied(userId: string, id: string) {
  const outreach = assertOwned(await getLeadOutreach(userId, id), "Outreach not found.");
  if (
    outreach.status !== LEAD_OUTREACH_STATUS.sent &&
    outreach.status !== LEAD_OUTREACH_STATUS.approved
  ) {
    throw new Error("Only approved or sent outreach can be marked as replied.");
  }
  const updated = await prisma.leadOutreach.update({
    where: { id },
    data: { status: LEAD_OUTREACH_STATUS.replied },
  });
  await writeEvent({
    outreachId: id,
    actorUserId: userId,
    action: LEAD_OUTREACH_ACTION.marked_replied,
    bodySnapshot: outreach.body,
    metadata: { note: "Manual status only" },
  });
  return updated;
}
