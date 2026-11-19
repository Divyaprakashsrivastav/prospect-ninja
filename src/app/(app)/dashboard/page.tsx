import Link from "next/link";
import { Banner } from "@/components/Banner";
import { Button } from "@/components/Button";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { AnalyticsCharts } from "@/components/dashboard/Charts";
import { CampaignOverview } from "@/components/dashboard/CampaignOverview";
import { KpiGrid } from "@/components/dashboard/KpiGrid";
import { IconCalendar, IconPlus } from "@/components/icons";
import { PageHeader } from "@/components/PageHeader";
import { isPrismaUnavailable } from "@/lib/db";
import { requireUser } from "@/lib/session";
import {
  getAnalyticsSeries,
  getCampaignPerformance,
  getDashboardStats,
  listRecentActivity,
} from "@/modules/analytics/service";
import { listConnections } from "@/modules/integrations/service";
import styles from "./dashboard.module.css";

export default async function DashboardPage() {
  const user = await requireUser();

  let stats: Awaited<ReturnType<typeof getDashboardStats>> | null = null;
  let series: Awaited<ReturnType<typeof getAnalyticsSeries>> | null = null;
  let campaigns: Awaited<ReturnType<typeof getCampaignPerformance>> = [];
  let activity: Awaited<ReturnType<typeof listRecentActivity>> = [];
  let connections: Awaited<ReturnType<typeof listConnections>> = [];
  let loadError: string | null = null;

  try {
    [stats, series, campaigns, activity, connections] = await Promise.all([
      getDashboardStats(user.id),
      getAnalyticsSeries(user.id, 14),
      getCampaignPerformance(user.id),
      listRecentActivity(user.id, 12),
      listConnections(user.id),
    ]);
  } catch (error) {
    if (isPrismaUnavailable(error)) {
      loadError =
        "Database is temporarily unavailable. Dashboard data could not be loaded.";
    } else {
      throw error;
    }
  }

  const demo = connections.find((item) => item.provider === "demo");
  const todayLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date());

  return (
    <>
      <PageHeader
        kicker="Dashboard"
        title={`Welcome back, ${user.name}`}
        description="Prospect Ninja helps you discover LinkedIn prospects, generate AI outreach, and send only after human approval."
        meta={
          <span className={styles.dateMeta}>
            <IconCalendar size={14} />
            {todayLabel}
          </span>
        }
        actions={
          <Link href="/targeting/new">
            <Button>
              <IconPlus size={16} />
              Create campaign
            </Button>
          </Link>
        }
      />

      {loadError ? <Banner tone="error">{loadError}</Banner> : null}
      {demo ? (
        <Banner tone="warn">
          LinkedIn connection is the labelled demo provider. Sample prospects
          only — messages are never actually sent on LinkedIn.
        </Banner>
      ) : null}

      <KpiGrid stats={stats} />

      <div className={styles.sectionHead}>
        <h2>Analytics</h2>
        <p>Trends from your real workspace data over the last 14 days</p>
      </div>
      {series ? (
        <AnalyticsCharts series={series} />
      ) : (
        <Banner tone="warn">Analytics unavailable while the database is down.</Banner>
      )}

      <CampaignOverview campaigns={campaigns} loadError={loadError} />

      <ActivityFeed items={activity} />
    </>
  );
}
