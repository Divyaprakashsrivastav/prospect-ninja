import Link from "next/link";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { IconClipboardCheck } from "@/components/icons";
import { PageHeader } from "@/components/PageHeader";
import { requireUser } from "@/lib/session";
import { listApprovalQueue } from "@/modules/outreach/service";

export default async function ApprovalPage() {
  const user = await requireUser();
  const messages = await listApprovalQueue(user.id);

  return (
    <>
      <PageHeader
        kicker="Human review"
        title="Approval queue"
        description="Nothing is sent until you explicitly approve the current draft in Prospect Ninja."
        actions={
          <Link href="/studio">
            <Button variant="secondary">Open AI Message Studio</Button>
          </Link>
        }
      />
      <Card>
        {messages.length === 0 ? (
          <EmptyState
            icon={<IconClipboardCheck size={22} />}
            title="Queue is empty"
            description="Discover prospects and generate drafts to review them here before any send attempt."
            action={
              <Link href="/targeting">
                <Button>Open campaigns</Button>
              </Link>
            }
          />
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              style={{
                padding: "14px 0",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <div>
                <strong>{message.prospect.fullName}</strong>
                <div style={{ color: "var(--muted)", fontSize: 14 }}>
                  {message.prospect.companyName} · {message.campaign.name}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Badge status={message.status} />
                <Link href={`/approval/${message.id}`}>
                  <Button variant="secondary">Review</Button>
                </Link>
              </div>
            </div>
          ))
        )}
      </Card>
    </>
  );
}
