import { Banner } from "@/components/Banner";
import { Card } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { ConnectLinkedInPanel } from "@/components/ConnectLinkedInPanel";
import { SettingsPanel } from "@/components/SettingsPanel";
import { env } from "@/lib/env";
import { requireUser } from "@/lib/session";
import {
  getLinkedInConnection,
  listConnections,
} from "@/modules/integrations/service";

export default async function SettingsPage() {
  const user = await requireUser();
  const [connections, linkedin] = await Promise.all([
    listConnections(user.id),
    getLinkedInConnection(user.id),
  ]);

  return (
    <>
      <PageHeader
        kicker="Workspace"
        title="Settings"
        description="API keys stay on the server. This app never collects LinkedIn passwords."
      />
      <Banner>
        OpenAI is{" "}
        {env.openaiApiKey
          ? `configured (${env.openaiModel}).`
          : "not configured — DEMO OUTPUT templates are used. An external AI model is not called."}{" "}
        Prospect discovery uses{" "}
        {env.rocketreachApiKey
          ? `RocketReach people search (${env.rocketreachApiMode} API).`
          : "DEMO DATA — set ROCKETREACH_API_KEY to search real people."}{" "}
        HeyReach is {env.heyreachApiKey ? "configured" : "not configured"}.
      </Banner>
      <Card>
        <h2 style={{ marginBottom: 8 }}>Your LinkedIn account</h2>
        <p style={{ color: "var(--muted)", marginBottom: 12 }}>
          Linked through Unipile. Approved messages are sent from this account:
          a direct message to connections, otherwise a connection request with
          your message as the note.
        </p>
        <ConnectLinkedInPanel
          initial={{
            configured: linkedin.configured,
            status: linkedin.status,
            displayName: linkedin.displayName,
            lastError: linkedin.lastError,
            live: linkedin.live,
          }}
          showSkip={false}
        />
      </Card>
      <Card>
        <h2 style={{ marginBottom: 8 }}>Fallback provider</h2>
        <p style={{ color: "var(--muted)", marginBottom: 12 }}>
          Used only when no LinkedIn account is linked. The demo adapter records
          sends without delivering them.
        </p>
        <SettingsPanel connections={connections} />
      </Card>
    </>
  );
}
