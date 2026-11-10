import { env } from "@/lib/env";
import type { LinkedInProvider, SendResult } from "@/modules/integrations/types";

class NotConfiguredError extends Error {
  constructor() {
    super(
      "HeyReach is not configured. Add HEYREACH_API_KEY when the company provides official API access.",
    );
    this.name = "NotConfiguredError";
  }
}

export const heyReachProvider: LinkedInProvider = {
  id: "heyreach",
  label: "HeyReach (official API — not configured)",
  isConfigured: Boolean(env.heyreachApiKey),
  async discoverProspects() {
    throw new NotConfiguredError();
  },
  async sendMessage(): Promise<SendResult> {
    throw new NotConfiguredError();
  },
  getStatus() {
    return {
      provider: "heyreach",
      label: this.label,
      configured: Boolean(env.heyreachApiKey),
    };
  },
};
