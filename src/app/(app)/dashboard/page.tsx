import Link from "next/link";
import { Badge } from "@/components/Badge";
import { Banner } from "@/components/Banner";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import styles from "@/components/StatGrid.module.css";
import { formatDate } from "@/lib/dates";
import {
  DATABASE_UNREACHABLE_MESSAGE,
  isPrismaUnavailable,
} from "@/lib/db-errors";
import { requireUser } from "@/lib/session";
import {
  formatActivityAction,
  getDashboardStats,
  getRecentActivity,
  type DashboardActivityItem,
  type DashboardStats,
} from "@/modules/analytics/service";
import { listCampaigns } from "@/modules/campaigns/service";
import { listConnections } from "@/modules/integrations/service";

export default async function DashboardPage() {
  const user = await requireUser();
  let stats: DashboardStats | null = null;
  let campaigns: Awaited<ReturnType<typeof listCampaigns>> = [];
  let connections: Awaited<ReturnType<typeof listConnections>> = [];
  let activity: DashboardActivityItem[] = [];
  let databaseUnreachable = false;

  try {
    [stats, campaigns, connections, activity] = await Promise.all([
      getDashboardStats(user.id),
      listCampaigns(user.id),
      listConnections(user.id),
      getRecentActivity(user.id),
    ]);
  } catch (error) {
    if (!isPrismaUnavailable(error)) {
      throw error;
    }
    databaseUnreachable = true;
  }

  const demo = connections.find((item) => item.provider === "demo");
  const metricRows: Array<[string, string]> = databaseUnreachable
    ? [
        ["Campaigns", "—"],
        ["Prospects", "—"],
        ["Discovered today", "—"],
        ["Pending approval", "—"],
        ["Approved", "—"],
        ["Demo recorded", "—"],
        ["Sent", "—"],
        ["Failed", "—"],
      ]
    : [
        ["Campaigns", String(stats!.campaignCount)],
        ["Prospects", String(stats!.prospectCount)],
        ["Discovered today", String(stats!.discoveredToday)],
        ["Pending approval", String(stats!.pendingApproval)],
        ["Approved", String(stats!.approved)],
        ["Demo recorded", String(stats!.demoRecorded)],
        ["Sent", String(stats!.sent)],
        ["Failed", String(stats!.failed)],
      ];

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
      {databaseUnreachable ? (
        <Banner tone="error">{DATABASE_UNREACHABLE_MESSAGE}</Banner>
      ) : null}
      {demo ? (
        <Banner tone="warn">
          LinkedIn connection is the labelled demo provider. Sample prospects
          only — messages are never actually sent on LinkedIn.
        </Banner>
      ) : null}
      <div className={styles.grid} aria-live="polite">
        {metricRows.map(([label, value]) => (
          <div className={styles.stat} key={label}>
            <div className={styles.label}>{label}</div>
            <div className={styles.value}>{value}</div>
          </div>
        ))}
      </div>
      <div
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 0.8fr)",
        }}
      >
        <Card>
          {databaseUnreachable ? (
            <EmptyState
              title="Campaigns unavailable"
              description="Reconnect to the database to load your campaigns."
            />
          ) : campaigns.length === 0 ? (
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
                <Link
                  href="/targeting"
                  style={{ color: "var(--brand)", fontWeight: 600 }}
                >
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
                      {campaign.icp.jobTitles.slice(0, 3).join(", ") ||
                        "No titles"}
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
        <Card>
          <h2 style={{ marginBottom: 12 }}>Recent activity</h2>
          {databaseUnreachable ? (
            <p style={{ color: "var(--muted)", fontSize: 14 }}>
              Activity cannot be loaded while the database is unreachable.
            </p>
          ) : activity.length === 0 ? (
            <EmptyState
              title="No activity yet"
              description="Generate or approve a draft to see real audit events here."
              action={
                <Link href="/prospects">
                  <Button variant="secondary">Go to prospects</Button>
                </Link>
              }
            />
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {activity.map((item) => (
                <li
                  key={item.id}
                  style={{
                    padding: "10px 0",
                    borderTop: "1px solid var(--border)",
                    fontSize: 14,
                  }}
                >
                  <div style={{ fontWeight: 600 }}>
                    {formatActivityAction(item.action)}
                  </div>
                  <div style={{ color: "var(--muted)", fontSize: 13 }}>
                    {item.prospectName} · {item.campaignName}
                  </div>
                  <div style={{ color: "var(--muted)", fontSize: 12 }}>
                    {formatDate(item.createdAt)}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p style={{ marginTop: 16 }}>
            <Link href="/approval" style={{ color: "var(--brand)", fontWeight: 600 }}>
              Open approval queue
            </Link>
            {" · "}
            <Link href="/history" style={{ color: "var(--brand)", fontWeight: 600 }}>
              History
            </Link>
          </p>
        </Card>
      </div>
    </>
  );
}
