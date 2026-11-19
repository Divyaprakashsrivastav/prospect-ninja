import Link from "next/link";
import { Badge } from "@/components/Badge";
import { Banner } from "@/components/Banner";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import styles from "@/components/StatGrid.module.css";
import tableStyles from "@/components/CampaignTable.module.css";
import { formatDate } from "@/lib/dates";
import {
  DATABASE_UNREACHABLE_MESSAGE,
  isPrismaUnavailable,
} from "@/lib/db-errors";
import { requireUser } from "@/lib/session";
import {
  LEAD_MESSAGE_TYPE_LABELS,
  LEAD_OUTREACH_STATUS_LABELS,
  type LeadMessageType,
  type LeadOutreachStatus,
} from "@/modules/lead-outreach/constants";
import {
  getLeadOutreachStats,
  listWorkspaceOutreaches,
} from "@/modules/lead-outreach/service";
import { leadFullName } from "@/modules/leads/schema";

export default async function OutreachWorkspacePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  let listed: Awaited<ReturnType<typeof listWorkspaceOutreaches>> | null = null;
  let stats: Awaited<ReturnType<typeof getLeadOutreachStats>> | null = null;
  let databaseUnreachable = false;

  try {
    [listed, stats] = await Promise.all([
      listWorkspaceOutreaches(user.id, {
        status: params.status || undefined,
        page: params.page ? Number(params.page) : 1,
      }),
      getLeadOutreachStats(user.id),
    ]);
  } catch (error) {
    if (!isPrismaUnavailable(error)) {
      throw error;
    }
    databaseUnreachable = true;
  }

  const metricRows: Array<[string, string]> = databaseUnreachable
    ? [
        ["Draft", "—"],
        ["Approved", "—"],
        ["Sent (manual)", "—"],
        ["Replied", "—"],
      ]
    : [
        ["Draft", String(stats!.draft)],
        ["Approved", String(stats!.approved)],
        ["Sent (manual)", String(stats!.sent)],
        ["Replied", String(stats!.replied)],
      ];

  return (
    <>
      <PageHeader
        kicker="AI outreach"
        title="Outreach workspace"
        description="Generate, edit and approve lead messages. LinkedIn sending is not automated."
        actions={
          <Link href="/leads">
            <Button variant="secondary">Select leads</Button>
          </Link>
        }
      />
      {databaseUnreachable ? (
        <Banner tone="error">{DATABASE_UNREACHABLE_MESSAGE}</Banner>
      ) : null}
      <Banner tone="warn">
        Demo AI output is labelled when no OpenAI key is configured. Marking
        sent never calls LinkedIn.
      </Banner>
      <div className={styles.grid}>
        {metricRows.map(([label, value]) => (
          <div className={styles.stat} key={label}>
            <div className={styles.label}>{label}</div>
            <div className={styles.value}>{value}</div>
          </div>
        ))}
      </div>
      <Card>
        <form method="get" style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <select
            name="status"
            defaultValue={params.status ?? ""}
            className="input"
            style={{
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: "10px 12px",
            }}
          >
            <option value="">All statuses</option>
            {Object.entries(LEAD_OUTREACH_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <Button type="submit" variant="secondary">
            Filter
          </Button>
        </form>
        {databaseUnreachable ? (
          <EmptyState
            title="Outreach unavailable"
            description="Reconnect to the database to load outreach drafts."
          />
        ) : !listed || listed.total === 0 ? (
          <EmptyState
            title="No outreach drafts yet"
            description="Select leads and generate AI messages to populate this workspace."
            action={
              <Link href="/leads">
                <Button>Go to leads</Button>
              </Link>
            }
          />
        ) : (
          <div className={tableStyles.wrap}>
            <table className={tableStyles.table}>
              <thead>
                <tr>
                  <th>Lead</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Provider</th>
                  <th>Updated</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {listed.outreaches.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{leadFullName(item.lead)}</strong>
                      <div className={tableStyles.muted}>
                        {item.lead.jobTitle || item.lead.company || "—"}
                      </div>
                    </td>
                    <td>
                      {LEAD_MESSAGE_TYPE_LABELS[
                        item.messageType as LeadMessageType
                      ] ?? item.messageType}
                    </td>
                    <td>
                      <Badge status={item.status}>
                        {LEAD_OUTREACH_STATUS_LABELS[
                          item.status as LeadOutreachStatus
                        ] ?? item.status}
                      </Badge>
                    </td>
                    <td>
                      {item.aiProvider === "demo"
                        ? "DEMO OUTPUT"
                        : item.aiProvider ?? "—"}
                    </td>
                    <td>{formatDate(item.updatedAt)}</td>
                    <td>
                      <Link href={`/outreach/${item.id}`}>Open</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
