import type { AnalyticsSeries } from "@/modules/analytics/service";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/Button";
import Link from "next/link";
import styles from "./Charts.module.css";

function seriesHasData(points: Array<{ count: number }>) {
  return points.some((point) => point.count > 0);
}

function LineChart({
  title,
  subtitle,
  points,
  color = "var(--brand)",
}: {
  title: string;
  subtitle: string;
  points: Array<{ date: string; count: number }>;
  color?: string;
}) {
  const width = 360;
  const height = 140;
  const padX = 8;
  const padY = 12;
  const max = Math.max(...points.map((p) => p.count), 1);
  const coords = points.map((point, index) => {
    const x =
      padX + (index / Math.max(points.length - 1, 1)) * (width - padX * 2);
    const y =
      height - padY - (point.count / max) * (height - padY * 2);
    return { x, y, ...point };
  });
  const line = coords
    .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(" ");
  const area = `${line} L ${coords[coords.length - 1]?.x ?? 0} ${height - padY} L ${coords[0]?.x ?? 0} ${height - padY} Z`;
  const total = points.reduce((sum, p) => sum + p.count, 0);

  return (
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
        <div className={styles.total}>{total}</div>
      </div>
      {!seriesHasData(points) ? (
        <div className={styles.emptyChart}>
          <EmptyState
            title="No activity yet"
            description="Charts populate from real campaign, discovery, and message events."
          />
        </div>
      ) : (
        <>
          <svg
            className={styles.svg}
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label={title}
          >
            <path d={area} fill={color} opacity="0.12" />
            <path d={line} fill="none" stroke={color} strokeWidth="2.25" />
            {coords.map((c) =>
              c.count > 0 ? (
                <circle
                  key={c.date}
                  cx={c.x}
                  cy={c.y}
                  r="3"
                  fill={color}
                >
                  <title>
                    {c.date}: {c.count}
                  </title>
                </circle>
              ) : null,
            )}
          </svg>
          <div className={styles.axis}>
            <span>{points[0]?.date.slice(5)}</span>
            <span>{points[points.length - 1]?.date.slice(5)}</span>
          </div>
        </>
      )}
    </section>
  );
}

function StatusBars({
  rows,
}: {
  rows: Array<{ status: string; count: number }>;
}) {
  const max = Math.max(...rows.map((r) => r.count), 1);
  if (rows.length === 0) {
    return (
      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <div>
            <h3>Approval status</h3>
            <p>Distribution of message statuses</p>
          </div>
        </div>
        <EmptyState
          title="No messages yet"
          description="Generate and review drafts to see status breakdown."
          action={
            <Link href="/prospects">
              <Button variant="secondary">Open prospects</Button>
            </Link>
          }
        />
      </section>
    );
  }

  return (
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <div>
          <h3>Approval status</h3>
          <p>Live counts from your outreach messages</p>
        </div>
      </div>
      <div className={styles.bars}>
        {rows.map((row) => (
          <div key={row.status} className={styles.barRow}>
            <div className={styles.barMeta}>
              <span className={styles.barLabel}>
                {row.status.replaceAll("_", " ")}
              </span>
              <span className={styles.barCount}>{row.count}</span>
            </div>
            <div className={styles.barTrack}>
              <div
                className={styles.barFill}
                style={{ width: `${(row.count / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function AnalyticsCharts({ series }: { series: AnalyticsSeries }) {
  return (
    <div className={styles.grid}>
      <LineChart
        title="Campaign activity"
        subtitle={`Campaigns created · last ${series.days} days`}
        points={series.campaignsCreated}
        color="#2563eb"
      />
      <LineChart
        title="Prospect discovery"
        subtitle={`Prospects discovered · last ${series.days} days`}
        points={series.prospectsDiscovered}
        color="#0f766e"
      />
      <LineChart
        title="Message generation"
        subtitle={`AI drafts generated · last ${series.days} days`}
        points={series.messagesGenerated}
        color="#7c3aed"
      />
      <StatusBars rows={series.statusDistribution} />
    </div>
  );
}
