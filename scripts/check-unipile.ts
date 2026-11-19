/**
 * Live check of the Unipile key and DSN.
 * Run: npm run check:unipile
 *
 * Lists the workspace's connected accounts (counts and types only, never the
 * key or account details) and prints the Hosted Auth callback URL.
 */
import { env } from "../src/lib/env";
import { unipileClient } from "../src/modules/integrations/unipileClient";

async function main() {
  if (!env.unipileApiKey) {
    throw new Error("Set UNIPILE_API_KEY in .env.local.");
  }
  const result = await unipileClient.listAccounts();
  const items = result.items ?? [];
  const byType = items.reduce<Record<string, number>>((acc, item) => {
    const type = item.provider ?? "unknown";
    acc[type] = (acc[type] ?? 0) + 1;
    return acc;
  }, {});
  console.log(`Unipile v2 OK. ${items.length} connected account(s):`, byType);
  console.log(
    `Hosted Auth callback: ${env.authUrl}/api/v1/integrations/unipile/callback`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
