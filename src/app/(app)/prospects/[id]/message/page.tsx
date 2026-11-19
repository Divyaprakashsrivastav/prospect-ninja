import Link from "next/link";
import { notFound } from "next/navigation";
import { Banner } from "@/components/Banner";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { CopyMessageButton } from "@/components/CopyMessageButton";
import { GenerateMessageButton } from "@/components/GenerateMessageButton";
import { MessageReview } from "@/components/MessageReview";
import { PageHeader } from "@/components/PageHeader";
import styles from "@/components/MessagePreview.module.css";
import { requireUser } from "@/lib/session";
import { getLinkedInConnection } from "@/modules/integrations/service";
import { draftGenerationLabel } from "@/modules/outreach/constants";
import { getProspect } from "@/modules/prospects/service";

function evidenceList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
}

export default async function MessagePreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const [prospect, linkedin] = await Promise.all([
    getProspect(user.id, id),
    getLinkedInConnection(user.id),
  ]);
  if (!prospect) {
    notFound();
  }
  const draft = prospect.messages[0];
  const evidence = evidenceList(draft?.personalizationEvidence);
  const demo =
    draft?.aiProvider === "demo" || draft?.generationStatus === "demo";
  const edited = Boolean(
    draft?.originalBody && draft.body !== draft.originalBody,
  );
  const generation = draftGenerationLabel(draft);

  return (
    <>
      <PageHeader
        kicker="Message preview"
        title={prospect.fullName}
        description={[prospect.jobTitle ?? prospect.headline, prospect.companyName]
          .filter(Boolean)
          .join(" · ")}
      />
      {demo ? (
        <Banner tone="warn">
          DEMO OUTPUT — generated locally. An external AI model was not used.
        </Banner>
      ) : null}
      {prospect.isDemo && linkedin.live ? (
        <Banner tone="warn">
          DEMO DATA prospect — not a real LinkedIn member, so it can&apos;t be
          sent to from your linked account.
        </Banner>
      ) : null}
      <div className={styles.layout}>
        <Card>
          {!draft ? (
            <div>
              <p style={{ color: "var(--muted)", marginBottom: 12 }}>
                No draft yet. Generate a personalized LinkedIn message from the
                stored prospect and campaign facts.
              </p>
              <GenerateMessageButton prospectId={prospect.id} hasDraft={false} />
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 12 }}>
                <Badge status={generation.key}>{generation.label}</Badge>
              </div>
              {edited ? (
                <p className={styles.meta} style={{ marginTop: 0, marginBottom: 12 }}>
                  This body was edited after generation. The original AI draft is
                  kept separately and is not shown as the live message.
                </p>
              ) : null}
              <MessageReview
                // Remount when the draft changes server-side (regenerate, send).
                key={`${draft.id}:${draft.updatedAt.toISOString()}`}
                id={draft.id}
                body={draft.body}
                status={draft.status}
                linkedinLive={linkedin.live}
              />
              <div className={styles.actions}>
                <CopyMessageButton text={draft.body} />
              </div>
            </>
          )}
        </Card>
        <Card>
          <h2 className={styles.section} style={{ marginTop: 0 }}>
            Prospect
          </h2>
          <p className={styles.fact}>
            <strong>Name:</strong> {prospect.fullName}
          </p>
          <p className={styles.fact}>
            <strong>Title:</strong>{" "}
            {prospect.jobTitle ?? prospect.headline ?? "—"}
          </p>
          <p className={styles.fact}>
            <strong>Company:</strong> {prospect.companyName ?? "—"}
          </p>
          <p className={styles.fact}>
            <strong>Industry:</strong> {prospect.industry ?? "—"}
          </p>
          <p className={styles.fact}>
            <strong>Location:</strong> {prospect.location ?? "—"}
          </p>
          <p className={styles.fact}>
            <strong>Summary:</strong> {prospect.summary ?? "—"}
          </p>
          {draft ? (
            <>
              <h2 className={styles.section}>Personalization</h2>
              <p>{draft.personalizationReason ?? "—"}</p>
              <ul className={styles.evidence}>
                {evidence.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className={styles.meta}>
                Provider: {draft.aiProvider ?? "unknown"} · Model:{" "}
                {draft.aiModel ?? "—"} · Status: {draft.generationStatus}
                {draft.confidence != null
                  ? ` · Confidence ${draft.confidence.toFixed(2)}`
                  : ""}
              </p>
            </>
          ) : null}
          <p className={styles.meta}>
            <Link href={`/prospects/${prospect.id}`}>Prospect details</Link>
          </p>
        </Card>
      </div>
    </>
  );
}
