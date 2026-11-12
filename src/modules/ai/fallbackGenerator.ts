import type { MessageGenerator } from "@/modules/ai/types";

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? "there";
}

export const fallbackGenerator: MessageGenerator = {
  id: "template",
  async generateDraft(context) {
    const name = firstName(context.prospectName);
    const company = context.companyName?.trim();
    const headline = context.headline?.trim();
    const industry = context.industry?.trim();

    const lines = [`Hi ${name},`, ""];
    lines.push(
      `I'm ${context.senderName}. I'm reaching out because your profile${headline ? ` as ${headline}` : ""}${company ? ` at ${company}` : ""} looks relevant to ${context.campaignName}.`,
    );
    const product = context.productService?.trim();
    const objective = context.outreachObjective?.trim();
    if (product) {
      lines.push(`We help teams with ${product}.`);
    } else if (industry) {
      lines.push(
        `I work with teams in ${industry} and would like to learn whether a short conversation would be useful.`,
      );
    } else {
      lines.push(
        "I'd like to learn whether a short conversation would be useful — no fabricated claims, just a genuine intro.",
      );
    }
    if (objective) {
      lines.push(`The goal of this note is ${objective}.`);
    }
    lines.push("", "Best,", context.senderName);

    return { body: lines.join("\n"), source: "template" };
  },
};
