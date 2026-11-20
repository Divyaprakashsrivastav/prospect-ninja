import { prisma } from "../src/lib/db";
import { getAiProvider } from "../src/modules/ai";
import {
  approveLeadOutreach,
  editLeadOutreach,
  generateLeadOutreach,
  getLeadOutreach,
  listLeadOutreaches,
  markLeadOutreachReplied,
  markLeadOutreachSent,
  rejectLeadOutreach,
} from "../src/modules/lead-outreach/service";
import { createLead } from "../src/modules/leads/service";

async function main() {
  const provider = getAiProvider();
  if (provider.id !== "demo") {
    throw new Error("Tests expect demo AI when OPENAI_API_KEY is unset.");
  }

  const suffix = Date.now().toString();
  const owner = await prisma.user.create({
    data: {
      email: `outreach-owner-${suffix}@example.com`,
      name: "Outreach Owner",
      passwordHash: "test-hash",
    },
  });
  const other = await prisma.user.create({
    data: {
      email: `outreach-other-${suffix}@example.com`,
      name: "Outreach Other",
      passwordHash: "test-hash",
    },
  });

  const lead = await createLead(owner.id, {
    firstName: "Jordan",
    lastName: "Lee",
    jobTitle: "Head of Sales",
    company: "Northwind",
    industry: "SaaS",
    website: "https://example.com",
    status: "new",
    source: "manual",
  });

  const first = await generateLeadOutreach(owner.id, lead.id, {
    messageType: "professional",
    campaignContext: "Human-approved LinkedIn outreach for B2B teams.",
  });
  if (!first.body.includes("DEMO OUTPUT")) {
    throw new Error("Demo generation must label DEMO OUTPUT.");
  }
  if (first.aiProvider !== "demo") {
    throw new Error("Missing OpenAI key must not claim an external model.");
  }

  try {
    await generateLeadOutreach(owner.id, lead.id, {
      messageType: "professional",
      campaignContext: "Human-approved LinkedIn outreach for B2B teams.",
    });
    throw new Error("Duplicate draft should require replaceExisting.");
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !error.message.includes("Confirm replacement")
    ) {
      throw error;
    }
  }

  const replaced = await generateLeadOutreach(owner.id, lead.id, {
    messageType: "professional",
    campaignContext: "Human-approved LinkedIn outreach for B2B teams.",
    replaceExisting: true,
  });
  if (replaced.id !== first.id) {
    throw new Error("Replace should update the same lead+type record.");
  }

  const connection = await generateLeadOutreach(owner.id, lead.id, {
    messageType: "connection_request",
    campaignContext: "Brief intro about human-approved outreach.",
  });
  if (connection.id === replaced.id) {
    throw new Error("Different message types must not collide.");
  }

  const edited = await editLeadOutreach(
    owner.id,
    replaced.id,
    {
      body: "Edited outreach body that should clear approval when changed later.",
    },
  );
  if (edited.body.startsWith("DEMO OUTPUT")) {
    throw new Error("Edited body should persist user text.");
  }

  try {
    await generateLeadOutreach(owner.id, lead.id, {
      messageType: "professional",
      replaceExisting: true,
    });
    throw new Error("Edited draft must not overwrite without protection.");
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !error.message.includes("not overwritten")
    ) {
      throw error;
    }
  }

  await approveLeadOutreach(owner.id, edited.id);
  const approved = await getLeadOutreach(owner.id, edited.id);
  if (!approved || approved.status !== "approved" || !approved.approvedAt) {
    throw new Error("Approve did not persist.");
  }

  await markLeadOutreachSent(owner.id, edited.id);
  const sent = await getLeadOutreach(owner.id, edited.id);
  if (!sent || sent.status !== "sent") {
    throw new Error("Mark sent did not persist.");
  }

  await markLeadOutreachReplied(owner.id, edited.id);
  const replied = await getLeadOutreach(owner.id, edited.id);
  if (!replied || replied.status !== "replied") {
    throw new Error("Mark replied did not persist.");
  }

  await rejectLeadOutreach(owner.id, connection.id);
  const history = await listLeadOutreaches(owner.id, lead.id);
  if (history.length < 2) {
    throw new Error("Lead should keep outreach history for each message type.");
  }

  if (await getLeadOutreach(other.id, edited.id)) {
    throw new Error("Other user must not read owner outreach.");
  }

  await prisma.leadOutreachEvent.deleteMany({
    where: { actorUserId: { in: [owner.id, other.id] } },
  });
  await prisma.user.deleteMany({
    where: { id: { in: [owner.id, other.id] } },
  });
  console.log("Lead outreach tests passed.");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
