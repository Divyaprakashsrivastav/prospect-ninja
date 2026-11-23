import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { recordUnipileWebhook } from "@/modules/integrations/unipileWebhook";

/**
 * Public endpoint for Unipile webhooks (outside /api/v1, so no session is required).
 * Authenticity: Unipile sends the custom header we registered (Unipile-Auth: <secret>).
 * Every request is recorded in WebhookEvent; only verified ones get a 200.
 * Unipile retries up to 5 times unless it gets a 200 within 30s.
 */
export async function POST(request: Request) {
  if (!env.unipileWebhookSecret) {
    console.warn("[unipile webhook] UNIPILE_WEBHOOK_SECRET is not set; recording as unverified.");
  }

  try {
    const { id, verified } = await recordUnipileWebhook(request);
    if (!verified) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    return NextResponse.json({ ok: true, id });
  } catch (error) {
    console.error("[unipile webhook] failed to record", error);
    // Non-200 so Unipile retries.
    return NextResponse.json({ error: "Could not record webhook." }, { status: 500 });
  }
}
