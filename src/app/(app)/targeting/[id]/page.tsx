import { notFound } from "next/navigation";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { CampaignForm } from "@/components/CampaignForm";
import { DiscoverButton } from "@/components/DiscoverButton";
import { PageHeader } from "@/components/PageHeader";
import { requireUser } from "@/lib/session";
import { getCampaign } from "@/modules/campaigns/service";

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const campaign = await getCampaign(user.id, id);
  if (!campaign) {
    notFound();
  }

  return (
    <>
      <PageHeader
        kicker="Campaign"
        title={campaign.name}
        description={
          campaign.description ||
          "Edit the ICP or pull today's sample prospects (capped at 15)."
        }
        actions={
          <>
            <Badge status={campaign.isActive ? "active" : "paused"} />
            <DiscoverButton campaignId={campaign.id} />
          </>
        }
      />
      <Card>
        <CampaignForm
          campaignId={campaign.id}
          initial={{
            name: campaign.name,
            description: campaign.description,
            isActive: campaign.isActive,
            dailyDiscoverLimit: campaign.dailyDiscoverLimit,
            icp: campaign.icp,
          }}
        />
      </Card>
    </>
  );
}
