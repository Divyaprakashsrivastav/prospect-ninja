import Link from "next/link";
import { Badge } from "@/components/Badge";
import { Banner } from "@/components/Banner";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import styles from "@/components/StatGrid.module.css";
import { requireUser } from "@/lib/session";
import { getDashboardStats } from "@/modules/analytics/service";
import { listCampaigns } from "@/modules/campaigns/service";
import { getLinkedInConnection } from "@/modules/integrations/service";

export default async function DashboardPage() {
  const user = await requireUser();
  const [stats, campaigns, linkedin] = await Promise.all([
    getDashboardStats(user.id),
    listCampaigns(user.id),
    getLinkedInConnection(user.id),
  ]);

  return (
    <>
      <PageHeader
        kicker="Overview"
        title={`Welcome, ${user.name}`}
        description="Discover prospects, draft outreach, and send only after you approve."
        actions={
          <Link href="/targeting/new">
            <Button>Create campaign</Button>
          </Link>
        }
      />
      {linkedin.live ? null : linkedin.status === "needs_reconnect" ? (
        <Banner tone="warn">
          Your LinkedIn session expired, so sends are paused.{" "}
          <Link href="/connect-linkedin">Reconnect LinkedIn</Link>
        </Banner>
      ) : (
        <Banner tone="warn">
          LinkedIn isn&apos;t linked, so sends are simulated and nothing is
          delivered. <Link href="/connect-linkedin">Connect LinkedIn</Link>
        </Banner>
      )}
      <div className={styles.grid}>
        {[
          ["Campaigns", stats.campaignCount],
          ["Prospects", stats.prospectCount],
          ["Discovered today", stats.discoveredToday],
          ["Pending approval", stats.pendingApproval],
          ["Approved", stats.approved],
          ["Demo recorded", stats.demoRecorded],
          ["Sent", stats.sent],
          ["Invitations sent", stats.invitationsSent],
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
              <Link href="/targeting/new">
                <Button>Create campaign</Button>
              </Link>
            }
          />
        ) : (
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 12,
                alignItems: "center",
              }}
            >
              <h2>Your campaigns</h2>
              <Link href="/targeting" style={{ color: "var(--brand)", fontWeight: 600 }}>
                Manage all
              </Link>
            </div>
            {campaigns.map((campaign) => (
              <div
                key={campaign.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "10px 0",
                  borderTop: "1px solid var(--border)",
                }}
              >
                <div>
                  <Link href={`/targeting/${campaign.id}`}>
                    <strong>{campaign.name}</strong>
                  </Link>
                  <div style={{ color: "var(--muted)", fontSize: 13 }}>
                    {campaign.icp.jobTitles.slice(0, 3).join(", ") || "No titles"}
                    {" · "}
                    {campaign.prospectCount} prospects
                    {" · "}
                    {campaign.pendingApprovals} pending
                  </div>
                </div>
                <Badge status={campaign.isActive ? "active" : "paused"} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
