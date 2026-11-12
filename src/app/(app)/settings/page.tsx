import { Banner } from "@/components/Banner";
import { Card } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { SettingsPanel } from "@/components/SettingsPanel";
import { env } from "@/lib/env";
import { requireUser } from "@/lib/session";
import { listConnections } from "@/modules/integrations/service";

export default async function SettingsPage() {
  const user = await requireUser();
  const connections = await listConnections(user.id);

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
        HeyReach is {env.heyreachApiKey ? "configured" : "not configured"}.
      </Banner>
      <Card>
        <h2 style={{ marginBottom: 8 }}>LinkedIn integration</h2>
        <p style={{ color: "var(--muted)", marginBottom: 12 }}>
          Plug in an official provider later with HEYREACH_API_KEY. Until then,
          keep the demo adapter.
        </p>
        <SettingsPanel connections={connections} />
      </Card>
    </>
  );
}
