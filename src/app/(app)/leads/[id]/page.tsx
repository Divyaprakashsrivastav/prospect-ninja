import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/Badge";
import { Banner } from "@/components/Banner";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { LeadDeleteButton } from "@/components/LeadDeleteButton";
import { PageHeader } from "@/components/PageHeader";
import { formatDate } from "@/lib/dates";
import { requireUser } from "@/lib/session";
import {
  LEAD_STATUS_LABELS,
  leadFullName,
  type LeadStatus,
} from "@/modules/leads/schema";
import { getLead } from "@/modules/leads/service";

export default async function LeadDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; updated?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const query = await searchParams;
  const lead = await getLead(user.id, id);
  if (!lead) {
    notFound();
  }

  const rows: Array<[string, string]> = [
    ["Job title", lead.jobTitle || "—"],
    ["Company", lead.company || "—"],
    ["Email", lead.email || "—"],
    ["Phone", lead.phone || "—"],
    ["Industry", lead.industry || "—"],
    ["Location", lead.location || "—"],
    ["Company size", lead.companySize || "—"],
    ["Source", lead.source],
    ["Created", formatDate(lead.createdAt)],
    ["Updated", formatDate(lead.updatedAt)],
  ];

  return (
    <>
      <PageHeader
        kicker="Lead profile"
        title={leadFullName(lead)}
        description={[lead.jobTitle, lead.company].filter(Boolean).join(" · ") || "Lead"}
        actions={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link href={`/leads/${lead.id}/edit`}>
              <Button variant="secondary">Edit</Button>
            </Link>
            <Link href={`/leads/${lead.id}/outreach`}>
              <Button>Generate AI message</Button>
            </Link>
            <LeadDeleteButton leadId={lead.id} />
          </div>
        }
      />
      {query.created ? <Banner>Lead created.</Banner> : null}
      {query.updated ? <Banner>Lead updated.</Banner> : null}
      <div
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "1.2fr 0.8fr",
        }}
      >
        <Card>
          <div style={{ marginBottom: 12 }}>
            <Badge status={lead.status}>
              {LEAD_STATUS_LABELS[lead.status as LeadStatus] ?? lead.status}
            </Badge>
          </div>
          <dl style={{ display: "grid", gap: 10 }}>
            {rows.map(([label, value]) => (
              <div key={label}>
                <dt style={{ color: "var(--muted)", fontSize: 12 }}>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <h2 style={{ margin: "20px 0 8px" }}>Notes</h2>
          <p style={{ whiteSpace: "pre-wrap" }}>{lead.notes || "No notes."}</p>
        </Card>
        <Card>
          <h2 style={{ marginBottom: 8 }}>Links</h2>
          <p>
            {lead.linkedinUrl ? (
              <a href={lead.linkedinUrl} target="_blank" rel="noreferrer">
                LinkedIn profile
              </a>
            ) : (
              "No LinkedIn URL"
            )}
          </p>
          <p style={{ marginTop: 8 }}>
            {lead.website ? (
              <a href={lead.website} target="_blank" rel="noreferrer">
                Website
              </a>
            ) : (
              "No website"
            )}
          </p>
          <p style={{ marginTop: 16 }}>
            <Link href="/leads">Back to leads</Link>
          </p>
        </Card>
      </div>
    </>
  );
}
