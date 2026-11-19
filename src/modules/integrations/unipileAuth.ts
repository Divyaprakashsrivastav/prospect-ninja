import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import {
  isUnipileConfigured,
  unipileClient,
} from "@/modules/integrations/unipileClient";

export const UNIPILE_PROVIDER = "unipile";

export const UNIPILE_STATUS = {
  notConnected: "not_connected",
  pending: "pending",
  connected: "connected",
  needsReconnect: "needs_reconnect",
} as const;

const LINK_TTL_MS = 60 * 60 * 1000;

function signingSecret(): string {
  const secret = env.authSecret ?? process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not set.");
  }
  return secret;
}

/**
 * `state` sent to Hosted Auth and echoed back on the redirect: `<expiry>.<hmac>`.
 * The HMAC binds it to the user who started linking, so an `account_id` pasted
 * into someone else's callback URL is rejected.
 */
export function createLinkState(userId: string, expiresAt: number): string {
  return `${expiresAt}.${signState(userId, expiresAt)}`;
}

function signState(userId: string, expiresAt: number): string {
  return createHmac("sha256", signingSecret())
    .update(`unipile-link:${userId}:${expiresAt}`)
    .digest("base64url");
}

export function verifyLinkState(userId: string, state: string | null): boolean {
  const [rawExpiry, signature] = (state ?? "").split(".");
  const expiresAt = Number(rawExpiry);
  if (!signature || !Number.isFinite(expiresAt) || expiresAt < Date.now()) {
    return false;
  }
  const expected = Buffer.from(signState(userId, expiresAt));
  const actual = Buffer.from(signature);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function assertUnipileConfigured() {
  if (!isUnipileConfigured()) {
    throw new Error(
      "LinkedIn linking is not configured. Set UNIPILE_API_KEY on the server.",
    );
  }
}

export async function getUnipileConnection(userId: string) {
  return prisma.integrationConnection.findUnique({
    where: { userId_provider: { userId, provider: UNIPILE_PROVIDER } },
  });
}

/**
 * Creates a Unipile Hosted Auth URL for this user. Unipile redirects back to
 * our callback with the new `account_id` and the `state` we signed here.
 */
export async function createLinkUrl(
  userId: string,
  type: "create" | "reconnect" = "create",
): Promise<string> {
  assertUnipileConfigured();
  const existing = await getUnipileConnection(userId);
  const reconnectAccountId =
    type === "reconnect" ? existing?.externalAccountId ?? undefined : undefined;
  const expiresAt = Date.now() + LINK_TTL_MS;

  const url = await unipileClient.createAuthLink({
    redirectUri: `${env.authUrl}/api/v1/integrations/unipile/callback`,
    expiresOn: new Date(expiresAt),
    state: createLinkState(userId, expiresAt),
    reconnectAccountId,
  });

  // Keep a working connection usable while a new link is in progress.
  if (existing?.status !== UNIPILE_STATUS.connected) {
    await prisma.integrationConnection.upsert({
      where: { userId_provider: { userId, provider: UNIPILE_PROVIDER } },
      update: { status: UNIPILE_STATUS.pending, lastError: null },
      create: {
        userId,
        provider: UNIPILE_PROVIDER,
        status: UNIPILE_STATUS.pending,
      },
    });
  }
  return url;
}

/**
 * Finishes linking after Unipile's redirect. `userId` comes from the session,
 * `accountId` and `state` from the redirect's query string.
 */
export async function completeLink(
  userId: string,
  accountId: string,
  state: string | null,
) {
  assertUnipileConfigured();
  if (!verifyLinkState(userId, state)) {
    throw new Error("This LinkedIn link has expired or wasn't started from your account. Try again.");
  }
  await attachAccount(userId, accountId);
}

/**
 * Saves an existing Unipile account as this user's LinkedIn sender after
 * confirming it at Unipile. Used by the Hosted Auth callback and by
 * `npm run link:unipile` for accounts linked in the Unipile dashboard.
 */
export async function attachAccount(userId: string, accountId: string) {
  assertUnipileConfigured();
  // Don't trust the caller alone: confirm the account at Unipile.
  const account = await unipileClient.getAccount(accountId);
  if (account.provider && account.provider.toLowerCase() !== "linkedin") {
    throw new Error("The linked account is not a LinkedIn account.");
  }

  const owner = await prisma.integrationConnection.findUnique({
    where: { externalAccountId: accountId },
  });
  if (owner && owner.userId !== userId) {
    throw new Error("This LinkedIn account is already linked to another user.");
  }

  const previous = await getUnipileConnection(userId);
  const status =
    account.status === "disconnected"
      ? UNIPILE_STATUS.needsReconnect
      : UNIPILE_STATUS.connected;
  await prisma.integrationConnection.upsert({
    where: { userId_provider: { userId, provider: UNIPILE_PROVIDER } },
    update: {
      status,
      externalAccountId: accountId,
      displayName: account.name ?? null,
      lastError: null,
      connectedAt: new Date(),
    },
    create: {
      userId,
      provider: UNIPILE_PROVIDER,
      status,
      externalAccountId: accountId,
      displayName: account.name ?? null,
      connectedAt: new Date(),
    },
  });

  // Linking a different LinkedIn account replaces the old one; drop it at Unipile.
  if (previous?.externalAccountId && previous.externalAccountId !== accountId) {
    await unipileClient.deleteAccount(previous.externalAccountId).catch(() => {});
  }
}

/** Records a failed or cancelled Hosted Auth attempt. */
export async function failLink(userId: string, reason: string) {
  await prisma.integrationConnection.updateMany({
    where: {
      userId,
      provider: UNIPILE_PROVIDER,
      status: UNIPILE_STATUS.pending,
    },
    data: { status: UNIPILE_STATUS.notConnected, lastError: reason },
  });
}

export async function markNeedsReconnect(userId: string, error: string) {
  await prisma.integrationConnection.updateMany({
    where: { userId, provider: UNIPILE_PROVIDER },
    data: { status: UNIPILE_STATUS.needsReconnect, lastError: error },
  });
}

export async function disconnectUnipile(userId: string) {
  const connection = await getUnipileConnection(userId);
  if (connection?.externalAccountId && isUnipileConfigured()) {
    try {
      await unipileClient.deleteAccount(connection.externalAccountId);
    } catch (error) {
      // Already gone at Unipile is fine; anything else should surface.
      const status = (error as { status?: number }).status;
      if (status !== 404) {
        throw error;
      }
    }
  }
  await prisma.integrationConnection.updateMany({
    where: { userId, provider: UNIPILE_PROVIDER },
    data: {
      status: UNIPILE_STATUS.notConnected,
      externalAccountId: null,
      displayName: null,
      lastError: null,
      connectedAt: null,
    },
  });
}
