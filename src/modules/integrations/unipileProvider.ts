import {
  UnipileError,
  unipileClient,
  type UnipileUserProfile,
} from "@/modules/integrations/unipileClient";
import type {
  LinkedInProvider,
  SendInput,
  SendResult,
} from "@/modules/integrations/types";

/** LinkedIn's limit for the note on a connection request. */
export const INVITATION_NOTE_LIMIT = 300;

/** Extracts the public identifier from a profile URL such as linkedin.com/in/jane-doe-123/. */
export function linkedinPublicIdentifier(url: string): string | null {
  const match = url.match(/linkedin\.com\/in\/([^/?#]+)/i);
  if (!match) {
    return null;
  }
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

function isFirstDegree(profile: UnipileUserProfile): boolean {
  return profile.specifics?.network_distance === "FIRST_DEGREE";
}

function failure(error: unknown, resolvedProviderId?: string): SendResult {
  if (error instanceof UnipileError) {
    return {
      ok: false,
      simulated: false,
      resolvedProviderId,
      needsReconnect: error.needsReconnect,
      error: error.needsReconnect
        ? "Your LinkedIn session expired. Reconnect LinkedIn in Settings, then send again."
        : error.message,
    };
  }
  return {
    ok: false,
    simulated: false,
    resolvedProviderId,
    error: error instanceof Error ? error.message : "Unipile send failed.",
  };
}

/** Sends from one user's linked LinkedIn account (their Unipile account_id). */
export function createUnipileProvider(accountId: string): LinkedInProvider {
  return {
    id: "unipile",
    label: "LinkedIn via Unipile",
    isConfigured: true,
    async discoverProspects() {
      throw new Error("Prospect discovery does not use Unipile.");
    },
    async sendMessage({ prospect, body, linkedinProviderId }: SendInput) {
      const identifier =
        linkedinPublicIdentifier(prospect.linkedinUrl) ?? linkedinProviderId;
      if (!identifier) {
        return {
          ok: false,
          simulated: false,
          error: "This prospect has no LinkedIn profile URL to send to.",
        };
      }

      let profile: UnipileUserProfile;
      try {
        profile = await unipileClient.getProfile(accountId, identifier);
      } catch (error) {
        return failure(error);
      }
      const providerId = profile.id ?? linkedinProviderId ?? undefined;
      if (!providerId) {
        return {
          ok: false,
          simulated: false,
          error: "Unipile could not resolve this LinkedIn profile.",
        };
      }

      try {
        if (isFirstDegree(profile)) {
          const chat = await unipileClient.startChat(accountId, providerId, body);
          const messageId = Array.isArray(chat.message_id)
            ? chat.message_id[0]
            : chat.message_id;
          return {
            ok: true,
            simulated: false,
            kind: "message",
            providerMessageId: messageId ?? chat.chat_id,
            resolvedProviderId: providerId,
          };
        }

        if (profile.specifics?.relation_request_status === "PENDING") {
          return {
            ok: false,
            simulated: false,
            resolvedProviderId: providerId,
            retryable: true,
            error:
              "A connection request to this person is already pending on LinkedIn. Send again once they accept.",
          };
        }

        if (Array.from(body).length > INVITATION_NOTE_LIMIT) {
          return {
            ok: false,
            simulated: false,
            resolvedProviderId: providerId,
            retryable: true,
            error: `Not connected on LinkedIn, so this goes out as a connection request. Its note must be ${INVITATION_NOTE_LIMIT} characters or fewer. Shorten the message and approve it again.`,
          };
        }
        const invite = await unipileClient.sendRelationRequest(
          accountId,
          providerId,
          body,
        );
        return {
          ok: true,
          simulated: false,
          kind: "invitation",
          providerMessageId: invite.id,
          resolvedProviderId: providerId,
        };
      } catch (error) {
        return failure(error, providerId);
      }
    },
    getStatus() {
      return { provider: "unipile", label: this.label, configured: true };
    },
  };
}
