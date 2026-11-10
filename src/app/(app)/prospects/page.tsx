import Link from "next/link";
import { Badge } from "@/components/Badge";
import { Banner } from "@/components/Banner";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { formatDate } from "@/lib/dates";
import { requireUser } from "@/lib/session";
import { listProspects } from "@/modules/prospects/service";

export default async function ProspectsPage() {
  const user = await requireUser();
  const prospects = await listProspects(user.id);

  return (
    <>
      <PageHeader
        kicker="Database"
        title="Prospects"
        description="Unique per LinkedIn URL and provider ID. Duplicates are skipped."
      />
      <Banner>
        Profiles come from the authorized integration adapter. The default demo
        provider uses sample people, not live LinkedIn scraping.
      </Banner>
      <Card>
        {prospects.length === 0 ? (
          <EmptyState
            title="No prospects stored"
            description="Create a campaign and run discovery to populate this list."
            action={
              <Link href="/targeting">
                <Button>Go to targeting</Button>
              </Link>
            }
          />
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--muted)" }}>
                <th style={{ padding: "8px 0" }}>Name</th>
                <th>Company</th>
                <th>Campaign</th>
                <th>Status</th>
                <th>Discovered</th>
              </tr>
            </thead>
            <tbody>
              {prospects.map((prospect) => (
                <tr key={prospect.id} style={{ borderTop: "1px solid var(--border)" }}>
                  <td style={{ padding: "12px 0" }}>
                    <strong>{prospect.fullName}</strong>
                    <div style={{ color: "var(--muted)", fontSize: 13 }}>
                      {prospect.headline}
                    </div>
                  </td>
                  <td>{prospect.companyName ?? "—"}</td>
                  <td>{prospect.campaign.name}</td>
                  <td>
                    <Badge status={prospect.messages[0]?.status ?? "draft"} />
                  </td>
                  <td>{formatDate(prospect.discoveredAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
