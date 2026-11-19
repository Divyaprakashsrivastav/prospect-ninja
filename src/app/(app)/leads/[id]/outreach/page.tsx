import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/Badge";
import { Banner } from "@/components/Banner";
import { Card } from "@/components/Card";
import { GenerateLeadOutreachButton } from "@/components/GenerateLeadOutreachButton";
import { PageHeader } from "@/components/PageHeader";
import { formatDate } from "@/lib/dates";
import { requireUser } from "@/lib/session";
import {
  LEAD_MESSAGE_TYPE_LABELS,
  LEAD_OUTREACH_STATUS_LABELS,
  type LeadMessageType,
  type LeadOutreachStatus,
} from "@/modules/lead-outreach/constants";
import { listLeadOutreaches } from "@/modules/lead-outreach/service";
import { leadFullName } from "@/modules/leads/schema";
import { getLead } from "@/modules/leads/service";

export default async function LeadOutreachPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const lead = await getLead(user.id, id);
  if (!lead) {
    notFound();
  }
  const outreaches = await listLeadOutreaches(user.id, id);

  return (
    <>
      <PageHeader
        kicker="Lead outreach"
        title={leadFullName(lead)}
        description={[lead.jobTitle, lead.company].filter(Boolean).join(" · ")}
      />
      <Banner tone="warn">
        AI drafts use the OpenAI provider when configured; otherwise DEMO OUTPUT
        templates. Nothing is sent to LinkedIn from this screen.
      </Banner>
      <div
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "1fr 1fr",
        }}
      >
        <Card>
          <h2 style={{ marginBottom: 12 }}>Generate AI message</h2>
          <GenerateLeadOutreachButton
            leadId={lead.id}
            hasDraft={outreaches.some((item) => item.status === "draft")}
          />
        </Card>
        <Card>
          <h2 style={{ marginBottom: 12 }}>Lead facts used</h2>
          <p>{lead.jobTitle || "—"} · {lead.company || "—"}</p>
          <p>{lead.industry || "No industry"} · {lead.location || "No location"}</p>
          <p>{lead.website || "No website on file"}</p>
          <p style={{ marginTop: 12 }}>
            <Link href={`/leads/${lead.id}`}>Lead profile</Link>
          </p>
        </Card>
      </div>
      <Card>
        <h2 style={{ marginBottom: 12 }}>Outreach history</h2>
        {outreaches.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>
            No outreach drafts yet. Generate a message to start the history.
          </p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {outreaches.map((item) => (
              <li
                key={item.id}
                style={{
                  padding: "12px 0",
                  borderTop: "1px solid var(--border)",
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <Link href={`/outreach/${item.id}`}>
                    <strong>
                      {LEAD_MESSAGE_TYPE_LABELS[item.messageType as LeadMessageType] ??
                        item.messageType}
                    </strong>
                  </Link>
                  <div style={{ color: "var(--muted)", fontSize: 13 }}>
                    Updated {formatDate(item.updatedAt)}
                    {item.aiProvider
                      ? ` · ${item.aiProvider}${item.aiProvider === "demo" ? " (DEMO OUTPUT)" : ""}`
                      : ""}
                  </div>
                </div>
                <Badge status={item.status}>
                  {LEAD_OUTREACH_STATUS_LABELS[item.status as LeadOutreachStatus] ??
                    item.status}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
