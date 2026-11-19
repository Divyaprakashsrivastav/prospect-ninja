import { env } from "@/lib/env";

/**
 * Minimal client for the Unipile API v2.
 * Docs: https://developer.unipile.com/v2.0
 *
 * Every call goes to https://api.unipile.com/v2 with the `X-API-KEY` header.
 * Account-scoped calls put the user's linked account id (acc_...) in the path.
 */

const BASE_URL = "https://api.unipile.com/v2";
const TIMEOUT_MS = 30_000;
const MAX_RETRIES = 2;

/** LinkedIn Classic's primary inbox; the only inbox allowed to start chats. */
const LINKEDIN_INBOX = "CLASSIC_PRIMARY";

export class UnipileError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly body?: string,
  ) {
    super(message);
    this.name = "UnipileError";
  }

  /** The LinkedIn session behind the account is gone and must be re-authenticated. */
  get needsReconnect(): boolean {
    return /disconnected|invalid_credentials|expired_credentials|checkpoint|requires authentication/i.test(
      this.body ?? "",
    );
  }
}

export type UnipileAccount = {
  object?: "Account";
  id: string;
  /** e.g. "linkedin" */
  provider?: string;
  name?: string;
  /** running | errored | disconnected | degraded | partial */
  status?: string;
};

export type UnipileUserProfile = {
  object?: string;
  /** Provider user id used for messaging and relation requests. */
  id?: string;
  public_identifier?: string;
  first_name?: string;
  last_name?: string;
  specifics?: {
    /** SELF | FIRST_DEGREE | SECOND_DEGREE | THIRD_DEGREE | OUT_OF_NETWORK */
    network_distance?: string;
    member_id?: string;
    relation_request_status?: string;
  };
};

export type UnipileAuthLinkInput = {
  redirectUri: string;
  expiresOn: Date;
  state: string;
  /** Set to re-authenticate an existing account instead of linking a new one. */
  reconnectAccountId?: string;
};

export function isUnipileConfigured(): boolean {
  return Boolean(env.unipileApiKey);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function accountPath(accountId: string) {
  return `/${encodeURIComponent(accountId)}`;
}

async function request<T>(
  method: "GET" | "POST" | "DELETE",
  path: string,
  json?: unknown,
): Promise<T> {
  const apiKey = env.unipileApiKey;
  if (!apiKey) {
    throw new UnipileError("UNIPILE_API_KEY is not set.");
  }
  const headers: Record<string, string> = {
    "X-API-KEY": apiKey,
    Accept: "application/json",
  };
  if (json !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  let lastError: UnipileError | undefined;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    let res: Response;
    try {
      res = await fetch(`${BASE_URL}${path}`, {
        method,
        headers,
        body: json === undefined ? undefined : JSON.stringify(json),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (error) {
      lastError = new UnipileError(
        `Unipile request failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      // Sends are not idempotent; only retry network failures on reads.
      if (method === "GET" && attempt < MAX_RETRIES) {
        await sleep(1000 * 2 ** attempt);
        continue;
      }
      throw lastError;
    }

    const text = await res.text();
    if (res.ok) {
      return (text ? JSON.parse(text) : {}) as T;
    }

    lastError = new UnipileError(
      `Unipile ${method} ${path.split("?")[0]} failed with ${res.status}: ${text.slice(0, 300)}`,
      res.status,
      text,
    );
    // 429 means the request was not processed, so a retry is safe for any method.
    const retryable =
      res.status === 429 || (method === "GET" && res.status >= 500);
    if (retryable && attempt < MAX_RETRIES) {
      const retryAfter = Number.parseInt(res.headers.get("Retry-After") ?? "", 10);
      await sleep(
        Number.isFinite(retryAfter) ? retryAfter * 1000 : 1000 * 2 ** attempt,
      );
      continue;
    }
    throw lastError;
  }
  throw lastError ?? new UnipileError("Unipile request failed after retries.");
}

export const unipileClient = {
  /**
   * Creates a one-time Hosted Auth link. After login Unipile redirects to
   * `redirectUri?account_id=acc_...&provider=linkedin&state=<state>`, or with
   * `error_type`, `error_title`, `error_detail` on failure.
   */
  async createAuthLink(input: UnipileAuthLinkInput): Promise<string> {
    const common = {
      expires_on: input.expiresOn.toISOString(),
      redirect_uri: input.redirectUri,
      state: input.state,
    };
    const result = await request<{ link?: string }>(
      "POST",
      "/auth/link",
      input.reconnectAccountId
        ? { ...common, account_id: input.reconnectAccountId }
        : { ...common, providers: "linkedin" },
    );
    if (!result.link) {
      throw new UnipileError("Unipile did not return a Hosted Auth link.");
    }
    return result.link;
  },

  listAccounts() {
    return request<{ items?: UnipileAccount[] }>("GET", "/accounts");
  },

  getAccount(accountId: string) {
    return request<UnipileAccount>("GET", `/accounts${accountPath(accountId)}`);
  },

  deleteAccount(accountId: string) {
    return request<{ success?: boolean }>(
      "DELETE",
      `/accounts${accountPath(accountId)}`,
    );
  },

  /** `identifier` is a LinkedIn public identifier (the /in/<slug> part) or a provider user id. */
  getProfile(accountId: string, identifier: string) {
    return request<UnipileUserProfile>(
      "GET",
      `${accountPath(accountId)}/users/${encodeURIComponent(identifier)}`,
    );
  },

  /** Starts (or reuses) a 1:1 chat and sends `text`. 1st-degree connections only. */
  startChat(accountId: string, userId: string, text: string) {
    return request<{
      chat_id?: string;
      message_id?: string | string[] | null;
    }>(
      "POST",
      `${accountPath(accountId)}/inboxes/${LINKEDIN_INBOX}/chats/send`,
      { users_ids: userId, text },
    );
  },

  /** Sends a connection request with an optional note. */
  sendRelationRequest(accountId: string, userId: string, message: string) {
    return request<{ id?: string }>(
      "POST",
      `${accountPath(accountId)}/users/me/relation-requests`,
      { user_id: userId, message },
    );
  },
};
