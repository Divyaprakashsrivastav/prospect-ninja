import OpenAI from "openai";
import { env } from "@/lib/env";
import { AI_SYSTEM_PROMPT, buildFactPack } from "@/modules/ai/facts";
import { parseAiDraftOutput } from "@/modules/ai/output";
import type { AiProvider, DraftContext, GeneratedDraft } from "@/modules/ai/types";

export class OpenAiRateLimitError extends Error {
  constructor() {
    super("OpenAI rate limit reached. Try again in a moment.");
    this.name = "OpenAiRateLimitError";
  }
}

export class OpenAIProvider implements AiProvider {
  id = "openai";
  label = "OpenAI";
  model = env.openaiModel;

  async generate(context: DraftContext): Promise<GeneratedDraft> {
    if (!env.openaiApiKey) {
      throw new Error("OPENAI_API_KEY is not set.");
    }
    const client = new OpenAI({ apiKey: env.openaiApiKey });
    const facts = buildFactPack(context);

    try {
      const completion = await client.chat.completions.create({
        model: this.model,
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: AI_SYSTEM_PROMPT },
          { role: "user", content: JSON.stringify(facts) },
        ],
      });
      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error("OpenAI returned an empty response.");
      }
      const parsed = parseAiDraftOutput(content);
      return {
        ...parsed,
        provider: this.id,
        model: this.model,
        demo: false,
      };
    } catch (error) {
      const status = (error as { status?: number }).status;
      if (status === 429) {
        throw new OpenAiRateLimitError();
      }
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("OpenAI request failed.");
    }
  }
}

export const openaiProvider = new OpenAIProvider();
