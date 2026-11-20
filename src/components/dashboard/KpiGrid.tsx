import type { ReactNode } from "react";
import type { DashboardStats } from "@/modules/analytics/service";
import {
  IconAlert,
  IconCheck,
  IconClipboardCheck,
  IconInbox,
  IconMegaphone,
  IconSend,
  IconSparkles,
  IconTrendingDown,
  IconTrendingUp,
  IconUsers,
} from "@/components/icons";
import styles from "./KpiGrid.module.css";

function Trend({
  current,
  previous,
}: {
  current: number;
  previous: number;
}) {
  if (previous === 0 && current === 0) {
    return null;
  }
  if (previous === 0) {
    return (
      <span className={`${styles.trend} ${styles.trendUp}`} title="New activity today">
        <IconTrendingUp size={12} />
        New
      </span>
    );
  }
  const delta = Math.round(((current - previous) / previous) * 100);
  if (delta === 0) {
    return null;
  }
  const up = delta > 0;
  return (
    <span
      className={`${styles.trend} ${up ? styles.trendUp : styles.trendDown}`}
      title={`vs previous day (${previous})`}
    >
      {up ? <IconTrendingUp size={12} /> : <IconTrendingDown size={12} />}
      {up ? "+" : ""}
      {delta}%
    </span>
  );
}

function KpiCard({
  label,
  value,
  icon,
  tone = "default",
  trend,
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  tone?: "default" | "brand" | "success" | "warn" | "danger";
  trend?: ReactNode;
}) {
  return (
    <article className={`${styles.card} ${styles[tone]}`}>
      <div className={styles.top}>
        <span className={styles.icon}>{icon}</span>
        {trend}
      </div>
      <div className={styles.value}>{value}</div>
      <div className={styles.label}>{label}</div>
    </article>
  );
}

export function KpiGrid({ stats }: { stats: DashboardStats | null }) {
  const dash = stats == null;
  const n = (value: number | undefined) => (dash ? "—" : value ?? 0);

  return (
    <div className={styles.grid}>
      <KpiCard
        label="Total campaigns"
        value={n(stats?.campaignCount)}
        icon={<IconMegaphone size={18} />}
        tone="brand"
      />
      <KpiCard
        label="Total prospects"
        value={n(stats?.prospectCount)}
        icon={<IconUsers size={18} />}
      />
      <KpiCard
        label="Discovered today"
        value={n(stats?.discoveredToday)}
        icon={<IconInbox size={18} />}
        trend={
          stats ? (
            <Trend
              current={stats.discoveredToday}
              previous={stats.discoveredYesterday}
            />
          ) : null
        }
      />
      <KpiCard
        label="AI messages generated"
        value={n(stats?.aiMessagesGenerated)}
        icon={<IconSparkles size={18} />}
        tone="brand"
      />
      <KpiCard
        label="Pending approval"
        value={n(stats?.pendingApproval)}
        icon={<IconClipboardCheck size={18} />}
        tone="warn"
      />
      <KpiCard
        label="Approved messages"
        value={n(stats?.approved)}
        icon={<IconCheck size={18} />}
        tone="success"
      />
      <KpiCard
        label="Messages sent"
        value={n(stats?.sent)}
        icon={<IconSend size={18} />}
        tone="success"
      />
      <KpiCard
        label="Failed attempts"
        value={n(stats?.failed)}
        icon={<IconAlert size={18} />}
        tone="danger"
      />
    </div>
  );
}
