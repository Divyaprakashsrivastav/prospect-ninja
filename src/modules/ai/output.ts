import { z } from "zod";

export const aiDraftOutputSchema = z.object({
  message: z.string().trim().min(20).max(2000),
  personalizationReason: z.string().trim().min(5).max(500),
  personalizationEvidence: z.array(z.string().trim().min(1).max(240)).min(1).max(8),
  confidence: z.number().min(0).max(1),
});

export type AiDraftOutput = z.infer<typeof aiDraftOutputSchema>;

export function parseAiDraftOutput(value: unknown): AiDraftOutput {
  if (typeof value === "string") {
    try {
      return aiDraftOutputSchema.parse(JSON.parse(value));
    } catch {
      throw new Error("AI response was not valid JSON.");
    }
  }
  return aiDraftOutputSchema.parse(value);
}
