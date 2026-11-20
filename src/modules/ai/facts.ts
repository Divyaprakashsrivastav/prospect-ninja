import type { DraftContext } from "@/modules/ai/types";

const PLACEHOLDER_PATTERN =
  /\b(lorem ipsum|placeholder|asdf|xxx)\b|test(ing)? the system|^test$|^testing$|^n\/?a$|^todo$/i;

const MEETING_PATTERN =
  /\b(meet(ing)?|call|chat|intro|book|schedule|demo|appointment)\b/i;

export function isPlaceholderCopy(value: string | null | undefined): boolean {
  const text = value?.trim() ?? "";
  if (text.length < 8) {
    return true;
  }
  return PLACEHOLDER_PATTERN.test(text);
}

export function usableProductDescription(
  value: string | null | undefined,
): string | undefined {
  const text = value?.trim();
  if (!text || isPlaceholderCopy(text)) {
    return undefined;
  }
  return text;
}

export function configuredSenderName(
  value: string | null | undefined,
): string | undefined {
  const text = value?.trim();
  if (!text || isPlaceholderCopy(text)) {
    return undefined;
  }
  return text;
}

export function objectiveRequestsMeeting(
  value: string | null | undefined,
): boolean {
  const text = value?.trim() ?? "";
  if (!text || isPlaceholderCopy(text)) {
    return false;
  }
  return MEETING_PATTERN.test(text);
}

export function buildFactPack(context: DraftContext) {
  const verifiedProfile: Record<string, string> = {};
  const campaign: Record<string, string> = {};
  const missing: string[] = [];

  const profileFields: Array<[string, string | null | undefined]> = [
    ["firstName", context.firstName],
    ["lastName", context.lastName],
    ["prospectName", context.prospectName],
    ["jobTitle", context.jobTitle ?? context.headline],
    ["companyName", context.companyName],
    ["companySize", context.companySize],
    ["location", context.location],
    ["industry", context.industry],
    ["summary", context.summary],
    ["website", context.website],
  ];
  for (const [key, value] of profileFields) {
    const trimmed = value?.trim();
    if (trimmed) {
      verifiedProfile[key] = trimmed;
    } else {
      missing.push(key);
    }
  }

  const senderName = configuredSenderName(context.senderName);
  if (senderName) {
    campaign.senderName = senderName;
  } else {
    missing.push("senderName");
  }

  const product = usableProductDescription(context.productService);
  if (product) {
    campaign.productService = product;
  } else {
    missing.push("productService");
  }

  const objective = context.outreachObjective?.trim();
  if (objective && !isPlaceholderCopy(objective)) {
    campaign.outreachObjective = objective;
    campaign.objectiveRequestsMeeting = String(
      objectiveRequestsMeeting(objective),
    );
  } else {
    missing.push("outreachObjective");
  }

  if (context.campaignName.trim()) {
    campaign.campaignName = context.campaignName.trim();
  }
  const campaignDescription = context.campaignDescription?.trim();
  if (campaignDescription && !isPlaceholderCopy(campaignDescription)) {
    campaign.campaignDescription = campaignDescription;
  }
  const campaignContext = context.campaignContext?.trim();
  if (campaignContext && !isPlaceholderCopy(campaignContext)) {
    campaign.campaignContext = campaignContext;
  }
  if (context.messageType) {
    campaign.messageType = context.messageType;
  }
  if (context.tone?.trim()) {
    campaign.tone = context.tone.trim();
  }
  if (context.icpTitles.length > 0) {
    campaign.icpTitles = context.icpTitles.join(", ");
  }
  if (context.icpIndustries.length > 0) {
    campaign.icpIndustries = context.icpIndustries.join(", ");
  }
  if (context.icpLocations.length > 0) {
    campaign.icpLocations = context.icpLocations.join(", ");
  }

  return { verifiedProfile, campaign, missing };
}

export const AI_SYSTEM_PROMPT = `You write professional, conversational LinkedIn outreach on behalf of the sender.
The user JSON has verifiedProfile, campaign, and missing.

Rules for the "message" field (the text the prospect will read):
- Use only verifiedProfile for the prospect/lead. Treat campaign as the sender's offering, not as profile facts.
- Never invent achievements, interests, company news, mutual connections, or research.
- Do not claim you reviewed or researched a LinkedIn profile or website beyond the supplied website string.
- Never use sensitive personal information (phone numbers, personal emails) in the message.
- Avoid generic openings such as "I hope this message finds you well" or "I came across your profile".
- If senderName is missing, do not introduce or sign with any person. Never invent a sender name.
- If productService is missing, do not mention a product or invent an offering.
- Do not make unsupported claims about the product.
- Do not ask for a meeting, call, or time unless campaign.objectiveRequestsMeeting is "true".
- Avoid aggressive sales language.
- Respect campaign.messageType when present:
  - connection_request: short LinkedIn connection note (under 280 characters if possible).
  - follow_up: concise follow-up that references prior outreach intent without inventing a prior conversation.
  - professional: standard professional outreach under 90 words.

The other fields are for the sender's review only and are never sent to the prospect:
- personalizationReason: one sentence telling the sender why the message is personalized this way.
- personalizationEvidence: an array of strings, one per fact used, each citing a verifiedProfile or campaign field that was actually supplied, prefixed with "verified:" or "campaign:" (for example "verified: jobTitle: Founder and CEO").
- confidence: a number from 0 to 1 for how well the supplied data supports the message.

Return JSON only with exactly these keys: message, personalizationReason, personalizationEvidence, confidence.`;
