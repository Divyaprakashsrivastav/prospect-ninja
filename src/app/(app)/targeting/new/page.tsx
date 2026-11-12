import { Card } from "@/components/Card";
import { CampaignForm } from "@/components/CampaignForm";
import { PageHeader } from "@/components/PageHeader";
import { requireUser } from "@/lib/session";

export default async function NewCampaignPage() {
  await requireUser();
  return (
    <>
      <PageHeader
        kicker="Create"
        title="New campaign"
        description="Define the Ideal Customer Profile. Discovery is capped at 15 new prospects per day."
      />
      <Card>
        <CampaignForm />
      </Card>
    </>
  );
}
