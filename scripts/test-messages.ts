import { prisma } from "../src/lib/db";
import { parseAiDraftOutput } from "../src/modules/ai/output";
import { demoAiProvider } from "../src/modules/ai/demoProvider";
import { getAiProvider } from "../src/modules/ai";
import {
  openaiProvider,
  OpenAiRateLimitError,
} from "../src/modules/ai/openaiProvider";
import { createCampaign, updateCampaign } from "../src/modules/campaigns/service";
import type { CampaignInput } from "../src/modules/campaigns/schema";
import { discoverForCampaign } from "../src/modules/prospects/service";
import {
  editMessage,
  generateDraftForProspect,
  generateDraftsForCampaign,
} from "../src/modules/outreach/service";
import { MESSAGE_STATUS } from "../src/modules/outreach/constants";

const icp: CampaignInput = {
  name: "AI draft QA",
  description: "Campaign used to verify AI message generation.",
  isActive: true,
  dailyDiscoverLimit: 15,
  icp: {
    jobTitles: ["CEO", "Founder", "CTO"],
    industries: ["SaaS", "FinTech"],
    locations: ["Australia", "United States", "United Kingdom"],
    companySize: "11-50",
    keywords: [],
    exclusions: [],
    productService: "Human-approved LinkedIn outreach for B2B teams.",
    outreachObjective: "Share how teams keep outreach human-approved.",
    tone: "professional",
  },
};

async function expectError(run: () => Promise<unknown>, snippet: string) {
  try {
    await run();
    throw new Error(`Expected error containing "${snippet}".`);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes(snippet)) {
      throw error;
    }
  }
}

async function main() {
  parseAiDraftOutput({
    message: "Hello there, this is a valid structured sample message.",
    personalizationReason: "Uses the job title from stored data.",
    personalizationEvidence: ["verified:jobTitle: CEO"],
    confidence: 0.8,
  });
  let rejected = false;
  try {
    parseAiDraftOutput({ message: "too short", extra: true });
  } catch {
    rejected = true;
  }
  if (!rejected) {
    throw new Error("Malformed AI output should be rejected.");
  }

  const provider = getAiProvider();
  if (provider.id !== "demo") {
    throw new Error("Missing OPENAI_API_KEY should select the demo AI provider.");
  }
  await expectError(
    () =>
      openaiProvider.generate({
        prospectName: "Amina Cole",
        campaignName: "AI draft QA",
        icpTitles: ["CEO"],
        icpIndustries: ["SaaS"],
        icpLocations: ["Australia"],
        productService: "Human-approved LinkedIn outreach for B2B teams.",
      }),
    "OPENAI_API_KEY is not set",
  );
  if (!(new OpenAiRateLimitError() instanceof Error)) {
    throw new Error("OpenAI rate-limit errors must be typed errors.");
  }
  await expectError(
    async () => parseAiDraftOutput("{not-json"),
    "not valid JSON",
  );

  const suffix = Date.now().toString();
  const owner = await prisma.user.create({
    data: {
      email: `ai-owner-${suffix}@example.com`,
      name: "Divya Prakash",
      passwordHash: "test-hash",
    },
  });
  const other = await prisma.user.create({
    data: {
      email: `ai-other-${suffix}@example.com`,
      name: "Other",
      passwordHash: "test-hash",
    },
  });
  const campaign = await createCampaign(owner.id, icp);
  await discoverForCampaign(owner.id, campaign.id);
  const prospects = await prisma.prospect.findMany({
    where: { userId: owner.id, campaignId: campaign.id },
    take: 3,
  });
  if (prospects.length < 2) {
    throw new Error("Need at least two prospects for generation tests.");
  }

  const first = await generateDraftForProspect(owner.id, prospects[0].id);
  if (!first.body.includes("DEMO OUTPUT")) {
    throw new Error("Demo provider must label DEMO OUTPUT.");
  }
  if (first.body.includes("Divya Prakash") || first.body.includes("I'm Divya")) {
    throw new Error("Account name must not be used as sender identity.");
  }
  if (!first.body.includes("Human-approved LinkedIn outreach for B2B teams.")) {
    throw new Error("Campaign product description must appear in the draft.");
  }
  if (/we offer testing the system/i.test(first.body)) {
    throw new Error("Placeholder product copy leaked into the draft.");
  }
  if (/let'?s (meet|book|schedule)|15-minute intro call/i.test(first.body)) {
    throw new Error("Meeting request added without an explicit campaign objective.");
  }
  if (first.status === MESSAGE_STATUS.sent || first.sentAt) {
    throw new Error("Generation must not send messages.");
  }
  if (first.aiProvider !== "demo" || first.aiModel !== "demo-template") {
    throw new Error("Demo generation must not claim an external model.");
  }

  await expectError(
    () => generateDraftForProspect(owner.id, prospects[0].id),
    "Confirm replacement",
  );

  await updateCampaign(owner.id, campaign.id, {
    ...icp,
    icp: { ...icp.icp, senderName: "Outreach Studio" },
  });
  const replaced = await generateDraftForProspect(owner.id, prospects[0].id, {
    replaceExisting: true,
  });
  if (!replaced.body.includes("Outreach Studio")) {
    throw new Error("Configured campaign sender name was not used.");
  }
  if (replaced.body.includes("Divya Prakash")) {
    throw new Error("Account name leaked after sender profile was set.");
  }

  const unnamed = await demoAiProvider.generate({
    firstName: "Amina",
    lastName: "Cole",
    prospectName: "Amina Cole",
    jobTitle: "CEO",
    companyName: "Lumen SaaS Labs",
    campaignName: "AI draft QA",
    icpTitles: ["CEO"],
    icpIndustries: ["SaaS"],
    icpLocations: ["Australia"],
    productService: "Human-approved LinkedIn outreach for B2B teams.",
    outreachObjective: "Share how teams keep outreach human-approved.",
    tone: "professional",
  });
  if (!unnamed.demo || unnamed.provider !== "demo") {
    throw new Error("Demo AI must not claim an external API was used.");
  }
  if (!unnamed.message.includes("DEMO OUTPUT")) {
    throw new Error("Local templates must be labelled DEMO OUTPUT.");
  }
  if (/I'm [A-Z]/.test(unnamed.message) || unnamed.message.includes("Divya")) {
    throw new Error("Demo template invented a sender identity.");
  }

  const placeholderCampaign = await createCampaign(owner.id, {
    ...icp,
    name: "Placeholder product QA",
    icp: { ...icp.icp, productService: "testing the system" },
  });
  await discoverForCampaign(owner.id, placeholderCampaign.id);
  const placeholderProspect = await prisma.prospect.findFirst({
    where: { userId: owner.id, campaignId: placeholderCampaign.id },
  });
  if (!placeholderProspect) {
    throw new Error("Placeholder campaign needs a prospect.");
  }
  await expectError(
    () => generateDraftForProspect(owner.id, placeholderProspect.id),
    "Configure a real product",
  );

  const bulk = await generateDraftsForCampaign(owner.id, campaign.id);
  if (bulk.succeeded < 1) {
    throw new Error("Bulk generation should create drafts for remaining prospects.");
  }
  if (bulk.skipped < 1) {
    throw new Error("Bulk generation must skip prospects that already have a draft.");
  }
  const secondBulk = await generateDraftsForCampaign(owner.id, campaign.id);
  if (secondBulk.succeeded !== 0) {
    throw new Error("Second bulk run sent duplicate AI requests.");
  }

  const persisted = await prisma.outreachMessage.findUniqueOrThrow({
    where: { id: first.id },
  });
  if (persisted.body !== replaced.body) {
    throw new Error("Draft did not persist.");
  }

  await editMessage(
    owner.id,
    first.id,
    "This is an editor-saved draft that should not be overwritten automatically.",
  );
  await expectError(
    () =>
      generateDraftForProspect(owner.id, prospects[0].id, {
        replaceExisting: true,
      }),
    "not overwritten",
  );

  await expectError(
    () => generateDraftForProspect(other.id, prospects[0].id),
    "Prospect not found.",
  );

  const afterProtect = await prisma.outreachMessage.findUniqueOrThrow({
    where: { id: first.id },
  });
  if (
    afterProtect.body !==
    "This is an editor-saved draft that should not be overwritten automatically."
  ) {
    throw new Error("Edited body was changed.");
  }

  await prisma.messageAuditEvent.deleteMany({
    where: { actorUserId: { in: [owner.id, other.id] } },
  });
  await prisma.user.deleteMany({
    where: { id: { in: [owner.id, other.id] } },
  });
  console.log("AI message generation tests passed.");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
