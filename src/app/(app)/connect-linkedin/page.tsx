import { Card } from "@/components/Card";
import { ConnectLinkedInPanel } from "@/components/ConnectLinkedInPanel";
import { PageHeader } from "@/components/PageHeader";
import { requireUser } from "@/lib/session";
import { getLinkedInConnection } from "@/modules/integrations/service";

export default async function ConnectLinkedInPage({
  searchParams,
}: {
  searchParams: Promise<{ result?: string; reason?: string }>;
}) {
  const user = await requireUser();
  const [{ result, reason }, connection] = await Promise.all([
    searchParams,
    getLinkedInConnection(user.id),
  ]);

  return (
    <>
      <PageHeader
        kicker="Setup"
        title="Connect your LinkedIn account"
        description="Messages you approve are sent from your own LinkedIn account. You log in on Unipile's secure page — this app never sees your LinkedIn password."
      />
      <Card>
        <ul style={{ paddingLeft: 18, marginBottom: 16, color: "var(--muted)" }}>
          <li>Connections receive your approved message as a direct message.</li>
          <li>
            Everyone else receives a connection request with your message as the
            note (LinkedIn limits notes to 300 characters).
          </li>
          <li>You can skip this and link later from Settings. Until then, sends are simulated.</li>
        </ul>
        <ConnectLinkedInPanel
          initial={{
            configured: connection.configured,
            status: connection.status,
            displayName: connection.displayName,
            lastError: connection.lastError,
            live: connection.live,
          }}
          result={result}
          reason={reason}
        />
      </Card>
    </>
  );
}
