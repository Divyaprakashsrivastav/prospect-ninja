import Link from "next/link";
import { Badge } from "@/components/Badge";
import { Banner } from "@/components/Banner";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { IconHistory } from "@/components/icons";
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
        title="Activity history"
        description="Send attempts and demo recordings from Prospect Ninja. Demo recordings stay separate from real LinkedIn deliveries."
      />
      <Banner tone="warn">
        Demo recorded means the message was approved and a send was attempted
        through the demo adapter. It was not delivered on LinkedIn.
      </Banner>
      <Card>
        {messages.length === 0 ? (
          <EmptyState
            icon={<IconHistory size={22} />}
            title="No activity yet"
            description="Approve a draft, then use Send. Unapproved messages never leave the queue."
            action={
              <Link href="/approval">
                <Button>Open approval queue</Button>
              </Link>
            }
          />
        ) : (
          <div style={{ width: "100%", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
              <thead>
                <tr style={{ textAlign: "left", color: "var(--muted)" }}>
                  <th style={{ padding: "8px 0", fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    Prospect
                  </th>
                  <th style={{ fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    Campaign
                  </th>
                  <th style={{ fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    Status
                  </th>
                  <th style={{ fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    When
                  </th>
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
          </div>
        )}
      </Card>
    </>
  );
}
