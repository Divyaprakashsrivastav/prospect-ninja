import Link from "next/link";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { IconSparkles } from "@/components/icons";
import { PageHeader } from "@/components/PageHeader";
import { requireUser } from "@/lib/session";
import { draftGenerationLabel } from "@/modules/outreach/constants";
import { listApprovalQueue } from "@/modules/outreach/service";

export default async function StudioPage() {
  const user = await requireUser();
  const messages = await listApprovalQueue(user.id);

  return (
    <>
      <PageHeader
        kicker="AI Message Studio"
        title="Draft, refine, approve"
        description="Work through AI-generated LinkedIn outreach. Nothing leaves Prospect Ninja until you approve the exact draft."
        actions={
          <Link href="/prospects">
            <Button variant="secondary">Browse prospects</Button>
          </Link>
        }
      />
      <Card>
        {messages.length === 0 ? (
          <EmptyState
            icon={<IconSparkles size={22} />}
            title="No messages in the studio"
            description="Discover prospects and generate AI drafts to review them here."
            action={
              <Link href="/targeting">
                <Button>Open campaigns</Button>
              </Link>
            }
          />
        ) : (
          messages.map((message) => {
            const generation = draftGenerationLabel(message);
            return (
              <div
                key={message.id}
                style={{
                  padding: "14px 0",
                  borderBottom: "1px solid var(--border)",
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <strong>{message.prospect.fullName}</strong>
                  <div style={{ color: "var(--muted)", fontSize: 14 }}>
                    {message.prospect.companyName || "Company unknown"} ·{" "}
                    {message.campaign.name}
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <Badge status={message.status} />
                  <Badge status={generation.key}>{generation.label}</Badge>
                  <Link href={`/approval/${message.id}`}>
                    <Button variant="secondary">Open draft</Button>
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </Card>
    </>
  );
}
