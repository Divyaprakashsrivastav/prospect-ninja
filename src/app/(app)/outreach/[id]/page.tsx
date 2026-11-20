import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/Badge";
import { Banner } from "@/components/Banner";
import { Card } from "@/components/Card";
import { CopyMessageButton } from "@/components/CopyMessageButton";
import { LeadOutreachReview } from "@/components/LeadOutreachReview";
import { PageHeader } from "@/components/PageHeader";
import styles from "@/components/MessagePreview.module.css";
import { formatDate } from "@/lib/dates";
import { requireUser } from "@/lib/session";
import {
  LEAD_MESSAGE_TYPE_LABELS,
  LEAD_OUTREACH_ACTION,
  LEAD_OUTREACH_STATUS_LABELS,
  type LeadMessageType,
  type LeadOutreachStatus,
} from "@/modules/lead-outreach/constants";
import { getLeadOutreach } from "@/modules/lead-outreach/service";
import { leadFullName } from "@/modules/leads/schema";

function evidenceList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
}

function actionLabel(action: string): string {
  switch (action) {
    case LEAD_OUTREACH_ACTION.generated:
      return "Generated";
    case LEAD_OUTREACH_ACTION.edited:
      return "Edited";
    case LEAD_OUTREACH_ACTION.approved:
      return "Approved";
    case LEAD_OUTREACH_ACTION.rejected:
      return "Rejected";
    case LEAD_OUTREACH_ACTION.marked_sent:
      return "Marked sent (manual)";
    case LEAD_OUTREACH_ACTION.marked_replied:
      return "Marked replied";
    default:
      return action;
  }
}

export default async function OutreachDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const outreach = await getLeadOutreach(user.id, id);
  if (!outreach) {
    notFound();
  }
  const demo =
    outreach.aiProvider === "demo" || outreach.generationStatus === "demo";
  const evidence = evidenceList(outreach.personalizationEvidence);

  return (
    <>
      <PageHeader
        kicker="Outreach draft"
        title={leadFullName(outreach.lead)}
        description={
          LEAD_MESSAGE_TYPE_LABELS[outreach.messageType as LeadMessageType] ??
          outreach.messageType
        }
      />
      {demo ? (
        <Banner tone="warn">
          DEMO OUTPUT — generated locally. An external AI model was not used.
        </Banner>
      ) : null}
      <div className={styles.layout}>
        <Card>
          <div style={{ marginBottom: 12 }}>
            <Badge status={outreach.status}>
              {LEAD_OUTREACH_STATUS_LABELS[
                outreach.status as LeadOutreachStatus
              ] ?? outreach.status}
            </Badge>
          </div>
          <LeadOutreachReview
            id={outreach.id}
            body={outreach.body}
            status={outreach.status}
            campaignContext={outreach.campaignContext}
            messageType={outreach.messageType}
          />
          <div className={styles.actions} style={{ marginTop: 12 }}>
            <CopyMessageButton text={outreach.body} />
          </div>
        </Card>
        <Card>
          <h2 className={styles.section} style={{ marginTop: 0 }}>
            Lead
          </h2>
          <p className={styles.fact}>
            <strong>Name:</strong> {leadFullName(outreach.lead)}
          </p>
          <p className={styles.fact}>
            <strong>Title:</strong> {outreach.lead.jobTitle || "—"}
          </p>
          <p className={styles.fact}>
            <strong>Company:</strong> {outreach.lead.company || "—"}
          </p>
          <p className={styles.fact}>
            <strong>Industry:</strong> {outreach.lead.industry || "—"}
          </p>
          <p className={styles.fact}>
            <strong>Website:</strong> {outreach.lead.website || "—"}
          </p>
          <h2 className={styles.section}>Personalization</h2>
          <p>{outreach.personalizationReason ?? "—"}</p>
          <ul className={styles.evidence}>
            {evidence.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className={styles.meta}>
            Provider: {outreach.aiProvider ?? "unknown"} · Model:{" "}
            {outreach.aiModel ?? "—"} · Status: {outreach.generationStatus}
            {outreach.confidence != null
              ? ` · Confidence ${outreach.confidence.toFixed(2)}`
              : ""}
          </p>
          <h2 className={styles.section}>Event history</h2>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {outreach.events.map((event) => (
              <li
                key={event.id}
                style={{
                  padding: "8px 0",
                  borderTop: "1px solid var(--border)",
                  fontSize: 13,
                }}
              >
                <strong>{actionLabel(event.action)}</strong>
                <div style={{ color: "var(--muted)" }}>
                  {formatDate(event.createdAt)}
                  {event.actor?.name ? ` · ${event.actor.name}` : ""}
                </div>
              </li>
            ))}
          </ul>
          <p className={styles.meta}>
            <Link href={`/leads/${outreach.leadId}/outreach`}>Lead outreach</Link>
            {" · "}
            <Link href="/outreach">Workspace</Link>
          </p>
        </Card>
      </div>
    </>
  );
}
