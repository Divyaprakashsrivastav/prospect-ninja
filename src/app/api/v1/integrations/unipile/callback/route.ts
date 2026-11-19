import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { getApiUser } from "@/lib/session";
import { completeLink, failLink } from "@/modules/integrations/unipileAuth";

function back(params: Record<string, string>) {
  const url = new URL("/connect-linkedin", env.authUrl);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return NextResponse.redirect(url);
}

/**
 * Unipile Hosted Auth redirects the browser here:
 *   success: ?account_id=acc_...&provider=linkedin&state=...
 *   failure: ?error_type=...&error_title=...&error_detail=...
 * The user comes from our session; the account is confirmed with Unipile in completeLink.
 */
export async function GET(request: Request) {
  const user = await getApiUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", env.authUrl));
  }

  const query = new URL(request.url).searchParams;
  const errorTitle = query.get("error_title") ?? query.get("error_type");
  const accountId = query.get("account_id");

  if (errorTitle || !accountId) {
    const reason = errorTitle ?? "LinkedIn login was cancelled.";
    await failLink(user.id, reason);
    return back({ result: "failure", reason });
  }

  try {
    await completeLink(user.id, accountId, query.get("state"));
    return back({ result: "success" });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Could not link LinkedIn.";
    console.error("[unipile callback]", reason);
    await failLink(user.id, reason);
    return back({ result: "failure", reason });
  }
}
