import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/Button";
import {
  IconActivity,
  IconCheck,
  IconHistory,
  IconMegaphone,
  IconMessage,
  IconSend,
  IconSparkles,
  IconUsers,
} from "@/components/icons";
import { formatDate } from "@/lib/dates";
import type { ActivityItem } from "@/modules/analytics/service";
import { AUDIT_ACTION } from "@/modules/outreach/constants";
import styles from "./ActivityFeed.module.css";

function iconFor(type: string) {
  switch (type) {
    case "campaign_created":
      return <IconMegaphone size={15} />;
    case "prospects_discovered":
      return <IconUsers size={15} />;
    case AUDIT_ACTION.generated:
      return <IconSparkles size={15} />;
    case AUDIT_ACTION.edited:
      return <IconMessage size={15} />;
    case AUDIT_ACTION.approved:
      return <IconCheck size={15} />;
    case AUDIT_ACTION.sendSucceeded:
    case AUDIT_ACTION.sendAttempted:
    case AUDIT_ACTION.demoSend:
      return <IconSend size={15} />;
    default:
      return <IconActivity size={15} />;
  }
}

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <section className={styles.panel}>
      <div className={styles.head}>
        <div>
          <h2>Recent activity</h2>
          <p>Real events from campaigns, discovery, and message audits</p>
        </div>
        <Link href="/history" className={styles.link}>
          <IconHistory size={14} /> History
        </Link>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="No activity yet"
          description="Create a campaign, discover prospects, or generate a message to start your timeline."
          action={
            <Link href="/targeting/new">
              <Button>Create campaign</Button>
            </Link>
          }
        />
      ) : (
        <ol className={styles.list}>
          {items.map((item) => (
            <li key={item.id} className={styles.item}>
              <span className={styles.icon}>{iconFor(item.type)}</span>
              <div className={styles.body}>
                <div className={styles.title}>{item.title}</div>
                <div className={styles.detail}>{item.detail}</div>
              </div>
              <time className={styles.time} dateTime={item.createdAt.toISOString()}>
                {formatDate(item.createdAt)}
              </time>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
