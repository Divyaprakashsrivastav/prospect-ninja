import Link from "next/link";
import { Card } from "@/components/Card";
import { CampaignForm } from "@/components/CampaignForm";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { requireUser } from "@/lib/session";
import { listCampaigns } from "@/modules/campaigns/service";

export default async function TargetingPage() {
  const user = await requireUser();
  const campaigns = await listCampaigns(user.id);

  return (
    <>
      <PageHeader
        kicker="ICP"
        title="Prospect targeting"
        description="One Ideal Customer Profile per campaign. Discovery adds at most 15 new people per day."
      />
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1.1fr 0.9fr" }}>
        <Card>
          <h2 style={{ marginBottom: 12 }}>New campaign</h2>
          <CampaignForm />
        </Card>
        <Card>
          <h2 style={{ marginBottom: 12 }}>Your campaigns</h2>
          {campaigns.length === 0 ? (
            <EmptyState
              title="Nothing here yet"
              description="Save an ICP on the left to start targeting."
            />
          ) : (
            campaigns.map((campaign) => (
              <p key={campaign.id} style={{ marginBottom: 10 }}>
                <Link href={`/targeting/${campaign.id}`}>
                  <strong>{campaign.name}</strong>
                </Link>
                <br />
                <span style={{ color: "var(--muted)", fontSize: 14 }}>
                  {campaign._count.prospects} prospects · limit{" "}
                  {campaign.dailyDiscoverLimit}/day
                </span>
              </p>
            ))
          )}
        </Card>
      </div>
    </>
  );
}
