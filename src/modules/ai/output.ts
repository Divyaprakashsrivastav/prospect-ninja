import { z } from "zod";

const MAX_EVIDENCE_LENGTH = 240;

// Evidence items are short citations of source fields. Long values (e.g. a
// verbose campaign productService) are truncated instead of failing the draft.
// Array.from splits by code point so emoji are never cut in half, which would
// produce a lone surrogate that Postgres JSONB rejects.
function truncateEvidence(value: string): string {
  const chars = Array.from(value);
  if (chars.length <= MAX_EVIDENCE_LENGTH) {
    return value;
  }
  return `${chars.slice(0, MAX_EVIDENCE_LENGTH - 1).join("").trimEnd()}…`;
}

export const aiDraftOutputSchema = z.object({
  message: z.string().trim().min(20).max(2000),
  personalizationReason: z.string().trim().min(5).max(500),
  personalizationEvidence: z
    .array(z.string().trim().min(1).transform(truncateEvidence))
    .min(1)
    .max(8),
  confidence: z.number().min(0).max(1),
});

export type AiDraftOutput = z.infer<typeof aiDraftOutputSchema>;

export function parseAiDraftOutput(value: unknown): AiDraftOutput {
  let candidate = value;
  if (typeof value === "string") {
    try {
      candidate = JSON.parse(value);
    } catch (error) {
      const reason = error instanceof Error ? ` (${error.message})` : "";
      throw new Error(`AI response was not valid JSON${reason}.`);
    }
  }
  const result = aiDraftOutputSchema.safeParse(candidate);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    throw new Error(`AI response did not match the expected format: ${issues}`);
  }
  return result.data;
}
