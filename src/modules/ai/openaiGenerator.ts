import OpenAI from "openai";
import { env } from "@/lib/env";
import { fallbackGenerator } from "@/modules/ai/fallbackGenerator";
import type { MessageGenerator } from "@/modules/ai/types";

export const openaiGenerator: MessageGenerator = {
  id: "openai",
  async generateDraft(context) {
    if (!env.openaiApiKey) {
      return fallbackGenerator.generateDraft(context);
    }

    try {
    const client = new OpenAI({ apiKey: env.openaiApiKey });
    const facts = JSON.stringify({
      senderName: context.senderName,
      prospectName: context.prospectName,
      headline: context.headline ?? null,
      companyName: context.companyName ?? null,
      location: context.location ?? null,
      industry: context.industry ?? null,
      campaignName: context.campaignName,
      icpTitles: context.icpTitles,
      productService: context.productService || null,
      outreachObjective: context.outreachObjective || null,
      tone: context.tone || "professional",
    });

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content:
            "Write a concise LinkedIn outreach message in the requested tone. Use only facts provided in JSON, including product/service and objective when present. Never invent personal details, metrics, mutual connections, or company news. If a field is null, omit it. Keep it under 90 words. No subject line.",
        },
        {
          role: "user",
          content: facts,
        },
      ],
    });

    const body = completion.choices[0]?.message?.content?.trim();
    if (!body) {
      return fallbackGenerator.generateDraft(context);
    }
    return { body, source: "openai" };
    } catch {
      return fallbackGenerator.generateDraft(context);
    }
  },
};
