import OpenAI from "openai";
import { env } from "@/lib/env";
import { AI_SYSTEM_PROMPT, buildFactPack } from "@/modules/ai/facts";
import { parseAiDraftOutput } from "@/modules/ai/output";
import type { AiProvider, DraftContext, GeneratedDraft } from "@/modules/ai/types";

// Cap on how much of the raw model output is echoed back in an error.
const MAX_RAW_IN_ERROR = 3000;

const DRAFT_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "message",
    "personalizationReason",
    "personalizationEvidence",
    "confidence",
  ],
  properties: {
    message: { type: "string" },
    personalizationReason: { type: "string" },
    personalizationEvidence: {
      type: "array",
      items: { type: "string" },
      description:
        'Each item cites one supplied field, prefixed "verified:" or "campaign:".',
    },
    confidence: {
      type: "number",
      description: "Number from 0 to 1.",
    },
  },
};

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
        // Structured outputs: OpenAI must return exactly these fields and
        // types (JSON mode alone only guarantees syntactically valid JSON).
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "outreach_draft",
            strict: true,
            schema: DRAFT_JSON_SCHEMA,
          },
        },
        messages: [
          { role: "system", content: AI_SYSTEM_PROMPT },
          { role: "user", content: JSON.stringify(facts) },
        ],
      });
      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error("OpenAI returned an empty response.");
      }
      let parsed;
      try {
        parsed = parseAiDraftOutput(content);
      } catch (parseError) {
        const reason =
          parseError instanceof Error ? parseError.message : "Invalid AI response.";
        console.error("[openai] draft rejected:", reason, "\nRaw response:", content);
        throw new Error(
          `${reason}\n\nRaw OpenAI response:\n${content.slice(0, MAX_RAW_IN_ERROR)}${
            content.length > MAX_RAW_IN_ERROR ? "…" : ""
          }`,
        );
      }
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
