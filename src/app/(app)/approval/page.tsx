import Link from "next/link";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
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
        description="Nothing is sent until you explicitly approve the current draft."
      />
      <Card>
        {messages.length === 0 ? (
          <EmptyState
            title="Queue is empty"
            description="Discover prospects to generate drafts for review."
            action={
              <Link href="/targeting">
                <Button>Open targeting</Button>
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
                <Link href={`/approval/${message.id}`}>Review</Link>
              </div>
            </div>
          ))
        )}
      </Card>
    </>
  );
}
