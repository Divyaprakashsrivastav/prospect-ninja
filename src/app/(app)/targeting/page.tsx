import Link from "next/link";
import { Badge } from "@/components/Badge";
import { Banner } from "@/components/Banner";
import { Button } from "@/components/Button";
import { CampaignActions } from "@/components/CampaignActions";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import tableStyles from "@/components/CampaignTable.module.css";
import { formatDateShort } from "@/lib/dates";
import { requireUser } from "@/lib/session";
import { listCampaigns } from "@/modules/campaigns/service";

export default async function TargetingPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; updated?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const campaigns = await listCampaigns(user.id);

  return (
    <>
      <PageHeader
        kicker="ICP"
        title="Campaigns"
        description="Each active campaign can discover up to 15 relevant prospects per day."
        actions={
          <Link href="/targeting/new">
            <Button>New campaign</Button>
          </Link>
        }
      />
      {params.created ? (
        <Banner>Campaign created. It now appears on your dashboard.</Banner>
      ) : null}
      {params.updated ? <Banner>Campaign changes saved.</Banner> : null}
      <Card>
        {campaigns.length === 0 ? (
          <EmptyState
            title="No campaigns yet"
            description="Create an Ideal Customer Profile to start discovering 15 prospects per day."
            action={
              <Link href="/targeting/new">
                <Button>Create campaign</Button>
              </Link>
            }
          />
        ) : (
          <div className={tableStyles.wrap}>
            <table className={tableStyles.table}>
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>Job titles</th>
                  <th>Locations</th>
                  <th>Industry</th>
                  <th>Status</th>
                  <th>Prospects</th>
                  <th>Pending</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((campaign) => (
                  <tr key={campaign.id}>
                    <td>
                      <Link href={`/targeting/${campaign.id}`}>
                        <strong>{campaign.name}</strong>
                      </Link>
                      {campaign.description ? (
                        <div className={tableStyles.muted}>
                          {campaign.description.slice(0, 80)}
                          {campaign.description.length > 80 ? "…" : ""}
                        </div>
                      ) : null}
                    </td>
                    <td>{campaign.icp.jobTitles.join(", ") || "—"}</td>
                    <td>{campaign.icp.locations.join(", ") || "—"}</td>
                    <td>{campaign.icp.industries.join(", ") || "—"}</td>
                    <td>
                      <Badge status={campaign.isActive ? "active" : "paused"} />
                    </td>
                    <td>{campaign.prospectCount}</td>
                    <td>{campaign.pendingApprovals}</td>
                    <td>{formatDateShort(campaign.createdAt)}</td>
                    <td>
                      <div className={tableStyles.actions}>
                        <Link href={`/targeting/${campaign.id}`}>
                          <Button variant="secondary">Edit</Button>
                        </Link>
                        <CampaignActions
                          campaignId={campaign.id}
                          isActive={campaign.isActive}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
