import { env } from "@/lib/env";
import type {
  ProspectProvider,
  ProspectSearchCriteria,
  ProviderProspectRecord,
} from "@/modules/discovery/types";

export class NotConfiguredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotConfiguredError";
  }
}

export class ExternalProspectProvider implements ProspectProvider {
  id = "external";
  label = "External prospecting provider (not configured)";

  async validateConnection() {
    if (!env.heyreachApiKey) {
      return {
        ok: false,
        message:
          "No approved external prospecting credentials are configured. Discovery uses the demo provider until official API access is supplied.",
      };
    }
    return {
      ok: false,
      message:
        "An API key is present, but search endpoints are not wired. Official provider documentation is required before live discovery can be enabled.",
    };
  }

  async searchProspects(
    criteria: ProspectSearchCriteria,
  ): Promise<{ records: ProviderProspectRecord[]; nextCursor?: string }> {
    void criteria;
    throw new NotConfiguredError(
      "External prospect search is not configured. Do not invent endpoints; wait for official provider documentation.",
    );
  }

  async getProspectDetails(id: string): Promise<ProviderProspectRecord | null> {
    void id;
    throw new NotConfiguredError(
      "External prospect details are not configured.",
    );
  }
}

export const externalProspectProvider = new ExternalProspectProvider();
