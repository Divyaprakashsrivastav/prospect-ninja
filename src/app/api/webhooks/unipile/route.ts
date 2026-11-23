import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { recordUnipileWebhook } from "@/modules/integrations/unipileWebhook";

/**
 * Public endpoint for Unipile v2 webhooks (outside /api/v1, so no session is required).
 * Authenticity: HMAC signature in the `unipile-signature` header, checked against
 * UNIPILE_WEBHOOK_SECRET (the endpoint secret from the Unipile dashboard).
 * UNIPILE_WEBHOOK_VERIFY="false" turns the check off.
 * Every request is recorded in WebhookEvent; only accepted ones get a 200.
 * Unipile needs a 2xx within 5s, else it retries after 2s and 12s.
 */
export async function POST(request: Request) {
  if (!env.unipileWebhookVerify) {
    console.warn("[unipile webhook] UNIPILE_WEBHOOK_VERIFY=false; accepting unsigned webhooks.");
  } else if (!env.unipileWebhookSecret) {
    console.warn("[unipile webhook] UNIPILE_WEBHOOK_SECRET is not set; rejecting all webhooks.");
  }

  try {
    const { id, accepted } = await recordUnipileWebhook(request);
    if (!accepted) {
      return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
    }
    return NextResponse.json({ received: true, id });
  } catch (error) {
    console.error("[unipile webhook] failed to record", error);
    // Non-2xx so Unipile retries.
    return NextResponse.json({ error: "Could not record webhook." }, { status: 500 });
  }
}
