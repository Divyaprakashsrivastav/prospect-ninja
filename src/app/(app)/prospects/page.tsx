import Link from "next/link";
import { Banner } from "@/components/Banner";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { Field, TextInput } from "@/components/Field";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import { BulkGenerateButton } from "@/components/BulkGenerateButton";
import { GenerateMessageButton } from "@/components/GenerateMessageButton";
import { ProspectDiscoveryBar } from "@/components/ProspectDiscoveryBar";
import tableStyles from "@/components/CampaignTable.module.css";
import { formatDateShort } from "@/lib/dates";
import { requireUser } from "@/lib/session";
import { listCampaigns } from "@/modules/campaigns/service";
import { draftGenerationLabel } from "@/modules/outreach/constants";
import { listProspects } from "@/modules/prospects/service";

function reasons(value: unknown): string {
  if (!Array.isArray(value)) {
    return "—";
  }
  return value.filter((item) => typeof item === "string").join(" ");
}

export default async function ProspectsPage({
  searchParams,
}: {
  searchParams: Promise<{
    campaignId?: string;
    q?: string;
    jobTitle?: string;
    industry?: string;
    location?: string;
    page?: string;
  }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const page = params.page ? Number(params.page) : 1;
  const [campaigns, listed] = await Promise.all([
    listCampaigns(user.id),
    listProspects(user.id, {
      campaignId: params.campaignId,
      q: params.q,
      jobTitle: params.jobTitle,
      industry: params.industry,
      location: params.location,
      page,
    }),
  ]);

  return (
    <>
      <PageHeader
        kicker="Discovery"
        title="Prospects"
        description="Up to 15 new sample prospects per campaign per day. Demo records are synthetic and labelled."
      />
      <Banner tone="warn">
        Discovery uses the demo provider unless an official API is configured.
        Sample people are labelled DEMO DATA and are not real LinkedIn users.
      </Banner>
      <Card>
        <ProspectDiscoveryBar
          campaigns={campaigns.map((campaign) => ({
            id: campaign.id,
            name: campaign.name,
            isActive: campaign.isActive,
          }))}
          selectedCampaignId={params.campaignId}
        />
      </Card>
      <Card>
        <form
          method="get"
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            marginBottom: 16,
          }}
        >
          <Field label="Search">
            <TextInput
              name="q"
              defaultValue={params.q}
              placeholder="Name or company"
            />
          </Field>
          <Field label="Job title">
            <TextInput name="jobTitle" defaultValue={params.jobTitle} />
          </Field>
          <Field label="Industry">
            <TextInput name="industry" defaultValue={params.industry} />
          </Field>
          <Field label="Location">
            <TextInput name="location" defaultValue={params.location} />
          </Field>
          <Field label="Campaign">
            <select
              name="campaignId"
              defaultValue={params.campaignId ?? ""}
              className="input"
              style={{
                width: "100%",
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: "10px 12px",
              }}
            >
              <option value="">All campaigns</option>
              {campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </option>
              ))}
            </select>
          </Field>
          <div style={{ display: "flex", alignItems: "end" }}>
            <Button type="submit" variant="secondary">
              Apply filters
            </Button>
          </div>
        </form>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 12,
            flexWrap: "wrap",
          }}
        >
          <p style={{ color: "var(--muted)" }}>
            Total prospects found: {listed.total}
          </p>
          <BulkGenerateButton campaignId={params.campaignId} />
        </div>
        {listed.prospects.length === 0 ? (
          <EmptyState
            title="No prospects stored"
            description="Select an active campaign and run discovery. Results are saved to PostgreSQL."
            action={
              <Link href="/targeting">
                <Button>Go to campaigns</Button>
              </Link>
            }
          />
        ) : (
          <div className={tableStyles.wrap}>
            <table className={tableStyles.table}>
              <thead>
                <tr>
                  <th>Prospect</th>
                  <th>Job title</th>
                  <th>Company</th>
                  <th>Industry</th>
                  <th>Location</th>
                  <th>Match</th>
                  <th>Why</th>
                  <th>Discovered</th>
                  <th>Source</th>
                  <th>Message</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {listed.prospects.map((prospect) => (
                  <tr key={prospect.id}>
                    <td>
                      <strong>{prospect.fullName}</strong>
                      {prospect.isDemo ? (
                        <div className={tableStyles.muted}>DEMO DATA</div>
                      ) : null}
                    </td>
                    <td>{prospect.jobTitle ?? prospect.headline ?? "—"}</td>
                    <td>{prospect.companyName ?? "—"}</td>
                    <td>{prospect.industry ?? "—"}</td>
                    <td>{prospect.location ?? "—"}</td>
                    <td>{prospect.matchScore}</td>
                    <td className={tableStyles.muted}>
                      {reasons(prospect.matchReasons) || "—"}
                    </td>
                    <td>{formatDateShort(prospect.discoveredAt)}</td>
                    <td>{prospect.isDemo ? "demo" : prospect.provider}</td>
                    <td>
                      {(() => {
                        const generation = draftGenerationLabel(
                          prospect.messages[0],
                        );
                        return <Badge status={generation.key}>{generation.label}</Badge>;
                      })()}
                    </td>
                    <td>
                      <div className={tableStyles.actions}>
                        <Link href={`/prospects/${prospect.id}`}>View</Link>
                        <Link href={`/prospects/${prospect.id}/message`}>
                          View draft
                        </Link>
                        <GenerateMessageButton
                          prospectId={prospect.id}
                          hasDraft={Boolean(prospect.messages[0])}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {listed.pageCount > 1 ? (
          <p style={{ marginTop: 16, display: "flex", gap: 12 }}>
            {page > 1 ? (
              <Link
                href={`/prospects?${new URLSearchParams({
                  ...(params.campaignId ? { campaignId: params.campaignId } : {}),
                  page: String(page - 1),
                }).toString()}`}
              >
                Previous
              </Link>
            ) : null}
            <span>
              Page {listed.page} of {listed.pageCount}
            </span>
            {page < listed.pageCount ? (
              <Link
                href={`/prospects?${new URLSearchParams({
                  ...(params.campaignId ? { campaignId: params.campaignId } : {}),
                  page: String(page + 1),
                }).toString()}`}
              >
                Next
              </Link>
            ) : null}
          </p>
        ) : null}
      </Card>
    </>
  );
}
