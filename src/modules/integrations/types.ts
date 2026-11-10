import type { Icp } from "@/modules/campaigns/schema";

export type DiscoveredProspect = {
  provider: "demo" | "heyreach";
  externalId: string;
  linkedinUrl: string;
  fullName: string;
  headline?: string;
  companyName?: string;
  location?: string;
  industry?: string;
  rawProfile: Record<string, string | number | undefined>;
};

export type SendResult = {
  ok: boolean;
  simulated: boolean;
  providerMessageId?: string;
  error?: string;
};

export interface LinkedInProvider {
  id: "demo" | "heyreach";
  label: string;
  isConfigured: boolean;
  discoverProspects(input: {
    icp: Icp;
    limit: number;
  }): Promise<DiscoveredProspect[]>;
  sendMessage(input: {
    prospect: DiscoveredProspect;
    body: string;
  }): Promise<SendResult>;
  getStatus(): { provider: string; label: string; configured: boolean };
}
