import { Badge } from "@/components/Badge";
import { Banner } from "@/components/Banner";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { formatDate } from "@/lib/dates";
import { requireUser } from "@/lib/session";
import { MESSAGE_STATUS } from "@/modules/outreach/constants";
import { listHistory } from "@/modules/outreach/service";

export default async function HistoryPage() {
  const user = await requireUser();
  const messages = await listHistory(user.id);

  return (
    <>
      <PageHeader
        kicker="Activity"
        title="Outreach history"
        description="Demo recordings are kept separate from real sends."
      />
      <Banner tone="warn">
        Demo recorded means the message was approved and a send was attempted
        through the demo adapter. It was not delivered on LinkedIn.
      </Banner>
      <Card>
        {messages.length === 0 ? (
          <EmptyState
            title="No send attempts yet"
            description="Approve a draft, then use Send. Unapproved messages never leave the queue."
          />
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--muted)" }}>
                <th style={{ padding: "8px 0" }}>Prospect</th>
                <th>Campaign</th>
                <th>Status</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {messages.map((message) => (
                <tr key={message.id} style={{ borderTop: "1px solid var(--border)" }}>
                  <td style={{ padding: "12px 0" }}>{message.prospect.fullName}</td>
                  <td>{message.campaign.name}</td>
                  <td>
                    <Badge status={message.status} />
                    {message.status === MESSAGE_STATUS.demoRecorded ? (
                      <div style={{ fontSize: 12, color: "var(--warn)" }}>
                        Not sent — demo provider
                      </div>
                    ) : null}
                  </td>
                  <td>{formatDate(message.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
