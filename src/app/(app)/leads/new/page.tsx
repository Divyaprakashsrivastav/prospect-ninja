import { Card } from "@/components/Card";
import { LeadForm } from "@/components/LeadForm";
import { PageHeader } from "@/components/PageHeader";
import { requireUser } from "@/lib/session";

export default async function NewLeadPage() {
  await requireUser();
  return (
    <>
      <PageHeader
        kicker="CRM"
        title="Add lead"
        description="Create a lead for your workspace. Discovery prospects remain under Prospects."
      />
      <Card>
        <LeadForm />
      </Card>
    </>
  );
}
