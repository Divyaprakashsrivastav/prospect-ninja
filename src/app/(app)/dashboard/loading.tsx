import { Card } from "@/components/Card";
import styles from "@/components/StatGrid.module.css";

export default function DashboardLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <p style={{ color: "var(--muted)", marginBottom: 16 }}>Loading dashboard…</p>
      <div className={styles.grid}>
        {Array.from({ length: 8 }).map((_, index) => (
          <div className={styles.stat} key={index}>
            <div className={styles.label}>—</div>
            <div className={styles.value} style={{ opacity: 0.35 }}>
              …
            </div>
          </div>
        ))}
      </div>
      <Card>
        <p style={{ color: "var(--muted)" }}>Loading campaigns and activity…</p>
      </Card>
    </div>
  );
}
