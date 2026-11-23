import { timingSafeEqual } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

/** Header name we register with Unipile; it carries UNIPILE_WEBHOOK_SECRET. */
export const UNIPILE_AUTH_HEADER = "unipile-auth";

/** Bodies past this are stored truncated (Unipile payloads are ~1 KB). */
const MAX_BODY_CHARS = 64 * 1024;

const REDACTED_HEADERS = new Set([UNIPILE_AUTH_HEADER, "cookie", "authorization"]);

/**
 * Payload shape per Unipile's v1 docs ("Users" webhook, event new_relation).
 * Not yet confirmed for API v2, so every field is optional and the raw body is kept.
 */
type UnipileWebhookPayload = {
  event?: unknown;
  account_id?: unknown;
  account_type?: unknown;
  user_provider_id?: unknown;
  user_public_identifier?: unknown;
  user_full_name?: unknown;
  user_profile_url?: unknown;
};

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function secretMatches(received: string | null): boolean {
  const expected = env.unipileWebhookSecret;
  if (!expected || !received) {
    return false;
  }
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function safeHeaders(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((value, key) => {
    out[key] = REDACTED_HEADERS.has(key.toLowerCase()) ? "[redacted]" : value;
  });
  return out;
}

function parse(rawBody: string): UnipileWebhookPayload | null {
  try {
    const value: unknown = JSON.parse(rawBody);
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as UnipileWebhookPayload)
      : null;
  } catch {
    return null;
  }
}

/** Match the event to our user (by Unipile account) and prospect (by LinkedIn member id). */
async function resolveOwners(payload: UnipileWebhookPayload | null) {
  const accountId = str(payload?.account_id);
  if (!accountId) {
    return { userId: null, prospectId: null };
  }
  const connection = await prisma.integrationConnection.findUnique({
    where: { externalAccountId: accountId },
    select: { userId: true },
  });
  if (!connection) {
    return { userId: null, prospectId: null };
  }
  const providerId = str(payload?.user_provider_id);
  const prospect = providerId
    ? await prisma.prospect.findFirst({
        where: { userId: connection.userId, linkedinProviderId: providerId },
        select: { id: true },
      })
    : null;
  return { userId: connection.userId, prospectId: prospect?.id ?? null };
}

/**
 * Records every inbound Unipile webhook. Unverified requests are stored too
 * (verified: false) so misconfiguration is visible, but they are never matched
 * to users or acted on.
 */
export async function recordUnipileWebhook(request: Request) {
  const fullBody = await request.text();
  const rawBody = fullBody.slice(0, MAX_BODY_CHARS);
  const verified = secretMatches(request.headers.get(UNIPILE_AUTH_HEADER));
  const payload = fullBody.length <= MAX_BODY_CHARS ? parse(rawBody) : null;

  const owners = verified
    ? await resolveOwners(payload)
    : { userId: null, prospectId: null };

  const record = await prisma.webhookEvent.create({
    data: {
      provider: "unipile",
      event: str(payload?.event),
      externalAccountId: str(payload?.account_id),
      verified,
      payload: (payload ?? undefined) as Prisma.InputJsonValue | undefined,
      rawBody,
      headers: safeHeaders(request.headers),
      userId: owners.userId,
      prospectId: owners.prospectId,
    },
    select: { id: true },
  });

  return { id: record.id, verified };
}
