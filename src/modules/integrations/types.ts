import type { Icp } from "@/modules/campaigns/schema";

export type LinkedInProviderId = "demo" | "heyreach" | "unipile";

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
  /** "message" = direct message; "invitation" = connection request with a note. */
  kind?: "message" | "invitation";
  providerMessageId?: string;
  /** LinkedIn member id resolved during the send, for caching on the prospect. */
  resolvedProviderId?: string;
  /** The linked account's LinkedIn session expired; the user must reconnect. */
  needsReconnect?: boolean;
  /** Nothing was sent and the user can fix it (e.g. shorten the note) and retry. */
  retryable?: boolean;
  error?: string;
};

export type SendInput = {
  prospect: DiscoveredProspect;
  body: string;
  /** Cached LinkedIn member id, when a previous send resolved it. */
  linkedinProviderId?: string | null;
};

export interface LinkedInProvider {
  id: LinkedInProviderId;
  label: string;
  isConfigured: boolean;
  discoverProspects(input: {
    icp: Icp;
    limit: number;
  }): Promise<DiscoveredProspect[]>;
  sendMessage(input: SendInput): Promise<SendResult>;
  getStatus(): { provider: string; label: string; configured: boolean };
}
