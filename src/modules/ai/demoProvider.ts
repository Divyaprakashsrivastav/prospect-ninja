import { parseAiDraftOutput } from "@/modules/ai/output";
import { buildFactPack, objectiveRequestsMeeting } from "@/modules/ai/facts";
import type { AiProvider, DraftContext, GeneratedDraft } from "@/modules/ai/types";

export class DemoAiProvider implements AiProvider {
  id = "demo";
  label = "Demo AI provider";
  model = "demo-template";

  async generate(context: DraftContext): Promise<GeneratedDraft> {
    const pack = buildFactPack(context);
    const first =
      pack.verifiedProfile.firstName ??
      pack.verifiedProfile.prospectName?.split(/\s+/)[0];
    const title = pack.verifiedProfile.jobTitle;
    const company = pack.verifiedProfile.companyName;
    const sender = pack.campaign.senderName;
    const product = pack.campaign.productService;
    const objective = pack.campaign.outreachObjective;

    const lines = ["DEMO OUTPUT — generated locally, not by an external AI model.", ""];
    if (first) {
      lines.push(`Hi ${first},`, "");
    }

    if (title && company) {
      lines.push(
        `Your role as ${title} at ${company} is the verified context used here.`,
      );
    } else if (company) {
      lines.push(`${company} is the verified company on file.`);
    } else {
      lines.push("Reaching out based only on the campaign ICP we stored.");
    }

    if (sender) {
      lines.push(`This note is from ${sender}.`);
    }

    if (product) {
      lines.push(product);
    }

    if (objective && objectiveRequestsMeeting(objective)) {
      lines.push(objective);
    } else if (objective) {
      lines.push(objective);
    }

    if (sender) {
      lines.push("", sender);
    }

    const evidence = [
      ...Object.entries(pack.verifiedProfile)
        .slice(0, 4)
        .map(([key, value]) => `verified:${key}: ${value}`),
      ...Object.entries(pack.campaign)
        .filter(([key]) => key === "productService" || key === "senderName")
        .map(([key, value]) => `campaign:${key}: ${value}`),
    ].slice(0, 6);

    const parsed = parseAiDraftOutput({
      message: lines.join("\n"),
      personalizationReason:
        "Uses verified prospect fields and campaign copy only. DEMO OUTPUT, not an external model.",
      personalizationEvidence:
        evidence.length > 0
          ? evidence
          : ["missing: insufficient verified profile fields"],
      confidence: pack.verifiedProfile.jobTitle && pack.verifiedProfile.companyName ? 0.6 : 0.4,
    });

    return {
      ...parsed,
      provider: this.id,
      model: this.model,
      demo: true,
    };
  }
}

export const demoAiProvider = new DemoAiProvider();
