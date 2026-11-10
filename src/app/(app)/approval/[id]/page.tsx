import { notFound } from "next/navigation";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { MessageReview } from "@/components/MessageReview";
import { PageHeader } from "@/components/PageHeader";
import { formatDate } from "@/lib/dates";
import { requireUser } from "@/lib/session";
import { getMessage } from "@/modules/outreach/service";

export default async function MessagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const message = await getMessage(user.id, id);
  if (!message) {
    notFound();
  }

  return (
    <>
      <PageHeader
        kicker={message.campaign.name}
        title={message.prospect.fullName}
        description={[
          message.prospect.headline,
          message.prospect.companyName,
          message.prospect.location,
        ]
          .filter(Boolean)
          .join(" · ")}
        actions={<Badge status={message.status} />}
      />
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1.2fr 0.8fr" }}>
        <Card>
          <MessageReview
            id={message.id}
            body={message.body}
            status={message.status}
          />
        </Card>
        <Card>
          <h2 style={{ marginBottom: 12 }}>Audit trail</h2>
          {message.auditEvents.length === 0 ? (
            <p style={{ color: "var(--muted)" }}>No events yet.</p>
          ) : (
            message.auditEvents.map((event) => (
              <div key={event.id} style={{ marginBottom: 12 }}>
                <strong>{event.action.replaceAll("_", " ")}</strong>
                <div style={{ color: "var(--muted)", fontSize: 13 }}>
                  {event.actor.name} · {formatDate(event.createdAt)}
                </div>
              </div>
            ))
          )}
        </Card>
      </div>
    </>
  );
}
