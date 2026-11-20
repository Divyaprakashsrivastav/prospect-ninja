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

const CONFIDENCE_WORDS: Record<string, number> = {
  "very high": 0.95,
  high: 0.85,
  medium: 0.6,
  moderate: 0.6,
  low: 0.35,
  "very low": 0.15,
};

// Splits "verified: a, verified: b, campaign: c" into one item per citation.
function splitEvidenceString(value: string): string[] {
  return value
    .split(/[,;\n]\s*(?=(?:verified|campaign)\s*:)/i)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function normalizeConfidence(value: unknown): unknown {
  let result = value;
  if (typeof value === "string") {
    const word = CONFIDENCE_WORDS[value.trim().toLowerCase()];
    if (word !== undefined) {
      return word;
    }
    const numeric = Number(value.trim().replace(/%$/, ""));
    if (!Number.isFinite(numeric)) {
      return value;
    }
    result = numeric;
  }
  // 85 or "85%" means 0.85.
  if (typeof result === "number" && result > 1 && result <= 100) {
    return result / 100;
  }
  return result;
}

// Models sometimes return near-miss shapes (evidence as one string, confidence
// as a word). Coerce those before strict validation instead of failing the draft.
function normalizeDraftShape(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }
  const draft = { ...(value as Record<string, unknown>) };
  if (typeof draft.personalizationEvidence === "string") {
    draft.personalizationEvidence = splitEvidenceString(
      draft.personalizationEvidence,
    );
  }
  if (Array.isArray(draft.personalizationEvidence)) {
    draft.personalizationEvidence = draft.personalizationEvidence.slice(0, 8);
  }
  draft.confidence = normalizeConfidence(draft.confidence);
  return draft;
}

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
  const result = aiDraftOutputSchema.safeParse(normalizeDraftShape(candidate));
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    throw new Error(`AI response did not match the expected format: ${issues}`);
  }
  return result.data;
}
