import type { AiDraftOutput } from "@/modules/ai/output";

export type DraftContext = {
  senderName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  prospectName: string;
  jobTitle?: string | null;
  headline?: string | null;
  companyName?: string | null;
  companySize?: string | null;
  location?: string | null;
  industry?: string | null;
  summary?: string | null;
  campaignName: string;
  campaignDescription?: string | null;
  icpTitles: string[];
  icpIndustries: string[];
  icpLocations: string[];
  productService?: string;
  outreachObjective?: string;
  tone?: string;
};

export type GeneratedDraft = AiDraftOutput & {
  provider: string;
  model: string;
  demo: boolean;
};

export interface AiProvider {
  id: string;
  label: string;
  model: string;
  generate(context: DraftContext): Promise<GeneratedDraft>;
}

export interface MessageGenerator {
  id: string;
  generateDraft(context: DraftContext): Promise<{ body: string; source: string }>;
}
