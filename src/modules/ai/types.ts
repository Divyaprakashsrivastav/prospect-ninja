export type DraftContext = {
  senderName: string;
  prospectName: string;
  headline?: string | null;
  companyName?: string | null;
  location?: string | null;
  industry?: string | null;
  campaignName: string;
  icpTitles: string[];
};

export interface MessageGenerator {
  id: string;
  generateDraft(context: DraftContext): Promise<{ body: string; source: string }>;
}
