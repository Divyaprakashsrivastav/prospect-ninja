import { notFound } from "next/navigation";
import { Card } from "@/components/Card";
import { LeadForm } from "@/components/LeadForm";
import { PageHeader } from "@/components/PageHeader";
import { requireUser } from "@/lib/session";
import { leadFullName, type LeadStatus } from "@/modules/leads/schema";
import { getLead } from "@/modules/leads/service";

export default async function EditLeadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const lead = await getLead(user.id, id);
  if (!lead) {
    notFound();
  }

  return (
    <>
      <PageHeader
        kicker="CRM"
        title={`Edit ${leadFullName(lead)}`}
        description="Changes are saved for your account only."
      />
      <Card>
        <LeadForm
          leadId={lead.id}
          initial={{
            firstName: lead.firstName,
            lastName: lead.lastName,
            jobTitle: lead.jobTitle,
            company: lead.company,
            email: lead.email ?? "",
            phone: lead.phone ?? "",
            linkedinUrl: lead.linkedinUrl ?? "",
            website: lead.website ?? "",
            industry: lead.industry,
            location: lead.location,
            companySize: lead.companySize,
            source: lead.source,
            status: lead.status as LeadStatus,
            notes: lead.notes,
          }}
        />
      </Card>
    </>
  );
}
