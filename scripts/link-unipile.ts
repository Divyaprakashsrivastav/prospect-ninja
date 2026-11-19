/**
 * Attaches a LinkedIn account you already connected in the Unipile dashboard
 * to an app user, so you don't have to link it again through /connect-linkedin.
 *
 * Run: npm run link:unipile -- <app user email> <acc_... id>
 *
 * Confirms the account at Unipile (GET /v2/accounts/{id}) first. Prints the
 * resulting connection status, never the API key.
 */
import { prisma } from "../src/lib/db";
import { attachAccount } from "../src/modules/integrations/unipileAuth";
import { getLinkedInConnection } from "../src/modules/integrations/service";

async function main() {
  const [email, accountId] = process.argv.slice(2);
  if (!email || !accountId?.startsWith("acc_")) {
    throw new Error("Usage: npm run link:unipile -- <app user email> <acc_... id>");
  }
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true },
  });
  if (!user) {
    throw new Error(`No app user with email ${email}. Register in the app first.`);
  }

  await attachAccount(user.id, accountId);
  const connection = await getLinkedInConnection(user.id);
  console.log(
    `Linked ${accountId} to ${email}: status=${connection.status}` +
      (connection.displayName ? `, LinkedIn name=${connection.displayName}` : ""),
  );
  if (!connection.live) {
    console.warn(
      "The account isn't sendable yet. If Unipile shows it as disconnected, reconnect it from Settings.",
    );
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
