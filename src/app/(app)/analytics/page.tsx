import Link from "next/link";
import { Banner } from "@/components/Banner";
import { Button } from "@/components/Button";
import { AnalyticsCharts } from "@/components/dashboard/Charts";
import { CampaignOverview } from "@/components/dashboard/CampaignOverview";
import { KpiGrid } from "@/components/dashboard/KpiGrid";
import { PageHeader } from "@/components/PageHeader";
import { isPrismaUnavailable } from "@/lib/db";
import { requireUser } from "@/lib/session";
import {
  getAnalyticsSeries,
  getCampaignPerformance,
  getDashboardStats,
} from "@/modules/analytics/service";

export default async function AnalyticsPage() {
  const user = await requireUser();

  let stats: Awaited<ReturnType<typeof getDashboardStats>> | null = null;
  let series: Awaited<ReturnType<typeof getAnalyticsSeries>> | null = null;
  let campaigns: Awaited<ReturnType<typeof getCampaignPerformance>> = [];
  let loadError: string | null = null;

  try {
    [stats, series, campaigns] = await Promise.all([
      getDashboardStats(user.id),
      getAnalyticsSeries(user.id, 14),
      getCampaignPerformance(user.id),
    ]);
  } catch (error) {
    if (isPrismaUnavailable(error)) {
      loadError = "Database is temporarily unavailable.";
    } else {
      throw error;
    }
  }

  return (
    <>
      <PageHeader
        kicker="Insights"
        title="Analytics"
        description="Campaign activity, discovery trends, and message performance from live Prospect Ninja data."
        actions={
          <Link href="/dashboard">
            <Button variant="secondary">Back to dashboard</Button>
          </Link>
        }
      />
      {loadError ? <Banner tone="error">{loadError}</Banner> : null}
      <KpiGrid stats={stats} />
      {series ? <AnalyticsCharts series={series} /> : null}
      <CampaignOverview campaigns={campaigns} loadError={loadError} />
    </>
  );
}
