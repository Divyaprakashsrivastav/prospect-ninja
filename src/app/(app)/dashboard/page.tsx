import Link from "next/link";
import { Banner } from "@/components/Banner";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import styles from "@/components/StatGrid.module.css";
import { requireUser } from "@/lib/session";
import { getDashboardStats } from "@/modules/analytics/service";
import { listCampaigns } from "@/modules/campaigns/service";
import { listConnections } from "@/modules/integrations/service";

export default async function DashboardPage() {
  const user = await requireUser();
  const [stats, campaigns, connections] = await Promise.all([
    getDashboardStats(user.id),
    listCampaigns(user.id),
    listConnections(user.id),
  ]);
  const demo = connections.find((item) => item.provider === "demo");

  return (
    <>
      <PageHeader
        kicker="Overview"
        title={`Welcome, ${user.name}`}
        description="Discover prospects, draft outreach, and send only after you approve."
        actions={
          <Link href="/targeting">
            <Button>Define ICP</Button>
          </Link>
        }
      />
      {demo ? (
        <Banner tone="warn">
          LinkedIn connection is the labelled demo provider. Sample prospects
          only — messages are never actually sent.
        </Banner>
      ) : null}
      <div className={styles.grid}>
        {[
          ["Campaigns", stats.campaignCount],
          ["Prospects", stats.prospectCount],
          ["Discovered today", stats.discoveredToday],
          ["Pending approval", stats.pendingApproval],
          ["Approved", stats.approved],
          ["Demo recorded", stats.demoRecorded],
          ["Sent", stats.sent],
          ["Failed", stats.failed],
        ].map(([label, value]) => (
          <div className={styles.stat} key={String(label)}>
            <div className={styles.label}>{label}</div>
            <div className={styles.value}>{value}</div>
          </div>
        ))}
      </div>
      <Card>
        {campaigns.length === 0 ? (
          <EmptyState
            title="No campaigns yet"
            description="Create an Ideal Customer Profile to start daily discovery (max 15 new prospects per campaign per day)."
            action={
              <Link href="/targeting">
                <Button>Create campaign</Button>
              </Link>
            }
          />
        ) : (
          <div>
            <h2 style={{ marginBottom: 12 }}>Active campaigns</h2>
            {campaigns.map((campaign) => (
              <p key={campaign.id} style={{ marginBottom: 8 }}>
                <Link href={`/targeting/${campaign.id}`}>
                  <strong>{campaign.name}</strong>
                </Link>
                {" · "}
                {campaign._count.prospects} prospects
                {campaign.isActive ? "" : " · paused"}
              </p>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
