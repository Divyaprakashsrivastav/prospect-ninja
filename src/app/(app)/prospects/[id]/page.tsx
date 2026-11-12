import Link from "next/link";
import { notFound } from "next/navigation";
import { Banner } from "@/components/Banner";
import { Card } from "@/components/Card";
import { GenerateMessageButton } from "@/components/GenerateMessageButton";
import { PageHeader } from "@/components/PageHeader";
import { formatDate } from "@/lib/dates";
import { requireUser } from "@/lib/session";
import { getProspect } from "@/modules/prospects/service";

export default async function ProspectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const prospect = await getProspect(user.id, id);
  if (!prospect) {
    notFound();
  }
  const reasons = Array.isArray(prospect.matchReasons)
    ? prospect.matchReasons.filter((item) => typeof item === "string")
    : [];

  return (
    <>
      <PageHeader
        kicker={prospect.campaign.name}
        title={prospect.fullName}
        description={[prospect.jobTitle ?? prospect.headline, prospect.companyName]
          .filter(Boolean)
          .join(" · ")}
      />
      {prospect.isDemo ? (
        <Banner tone="warn">
          DEMO DATA — synthetic sample. This is not a real LinkedIn user and was
          not scraped.
        </Banner>
      ) : null}
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1.2fr 0.8fr" }}>
        <Card>
          <p>
            <strong>Job title:</strong> {prospect.jobTitle ?? prospect.headline ?? "—"}
          </p>
          <p>
            <strong>Company:</strong> {prospect.companyName ?? "—"}
          </p>
          <p>
            <strong>Company size:</strong> {prospect.companySize ?? "—"}
          </p>
          <p>
            <strong>Industry:</strong> {prospect.industry ?? "—"}
          </p>
          <p>
            <strong>Location:</strong> {prospect.location ?? "—"}
          </p>
          <p style={{ marginTop: 12 }}>{prospect.summary ?? "No summary provided."}</p>
          <p style={{ marginTop: 12, color: "var(--muted)" }}>
            Profile placeholder: {prospect.linkedinUrl}
          </p>
        </Card>
        <Card>
          <h2 style={{ marginBottom: 8 }}>Match</h2>
          <p>
            <strong>Score:</strong> {prospect.matchScore}
          </p>
          <ul style={{ marginTop: 8, paddingLeft: 18 }}>
            {reasons.length === 0 ? (
              <li>No ICP field matches were recorded.</li>
            ) : (
              reasons.map((reason) => <li key={reason}>{reason}</li>)
            )}
          </ul>
          <p style={{ marginTop: 16, color: "var(--muted)", fontSize: 13 }}>
            Discovered {formatDate(prospect.discoveredAt)} via {prospect.provider}
          </p>
          <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <GenerateMessageButton
              prospectId={prospect.id}
              hasDraft={Boolean(prospect.messages[0])}
            />
            {prospect.messages[0] ? (
              <Link href={`/prospects/${prospect.id}/message`}>View draft</Link>
            ) : null}
          </div>
          <p style={{ marginTop: 12 }}>
            <Link href="/prospects">Back to prospects</Link>
          </p>
        </Card>
      </div>
    </>
  );
}
