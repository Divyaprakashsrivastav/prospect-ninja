import Link from "next/link";
import { Banner } from "@/components/Banner";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { Field, Select, TextInput } from "@/components/Field";
import { LeadImportExport } from "@/components/LeadImportExport";
import { LeadsTable } from "@/components/LeadsTable";
import { PageHeader } from "@/components/PageHeader";
import styles from "@/components/StatGrid.module.css";
import {
  DATABASE_UNREACHABLE_MESSAGE,
  isPrismaUnavailable,
} from "@/lib/db-errors";
import { requireUser } from "@/lib/session";
import {
  LEAD_STATUS_LABELS,
  LEAD_STATUSES,
} from "@/modules/leads/schema";
import { getLeadStats, listLeads } from "@/modules/leads/service";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    industry?: string;
    company?: string;
    sort?: string;
    order?: string;
    page?: string;
    created?: string;
    updated?: string;
    deleted?: string;
  }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  let listed: Awaited<ReturnType<typeof listLeads>> | null = null;
  let stats: Awaited<ReturnType<typeof getLeadStats>> | null = null;
  let databaseUnreachable = false;

  try {
    [listed, stats] = await Promise.all([
      listLeads(user.id, {
        q: params.q,
        status: params.status,
        industry: params.industry,
        company: params.company,
        sort: params.sort,
        order: params.order,
        page: params.page,
      }),
      getLeadStats(user.id),
    ]);
  } catch (error) {
    if (!isPrismaUnavailable(error)) {
      throw error;
    }
    databaseUnreachable = true;
  }

  const exportParams = new URLSearchParams();
  if (params.q) exportParams.set("q", params.q);
  if (params.status) exportParams.set("status", params.status);
  if (params.industry) exportParams.set("industry", params.industry);
  if (params.company) exportParams.set("company", params.company);
  if (params.sort) exportParams.set("sort", params.sort);
  if (params.order) exportParams.set("order", params.order);

  const metricRows: Array<[string, string]> = databaseUnreachable
    ? [
        ["Total leads", "—"],
        ["New", "—"],
        ["Contacted", "—"],
        ["Qualified", "—"],
        ["Converted", "—"],
      ]
    : [
        ["Total leads", String(stats!.total)],
        ["New", String(stats!.new)],
        ["Contacted", String(stats!.contacted)],
        ["Qualified", String(stats!.qualified)],
        ["Converted", String(stats!.converted)],
      ];

  return (
    <>
      <PageHeader
        kicker="CRM"
        title="Leads"
        description="Manual and imported leads for your workspace. Separate from campaign discovery prospects."
        actions={
          <Link href="/leads/new">
            <Button>Add lead</Button>
          </Link>
        }
      />
      {databaseUnreachable ? (
        <Banner tone="error">{DATABASE_UNREACHABLE_MESSAGE}</Banner>
      ) : null}
      {params.created ? <Banner>Lead created.</Banner> : null}
      {params.updated ? <Banner>Lead updated.</Banner> : null}
      {params.deleted ? <Banner>Lead deleted.</Banner> : null}

      <div className={styles.grid}>
        {metricRows.map(([label, value]) => (
          <div className={styles.stat} key={label}>
            <div className={styles.label}>{label}</div>
            <div className={styles.value}>{value}</div>
          </div>
        ))}
      </div>

      <Card>
        <LeadImportExport exportQuery={exportParams.toString()} />
      </Card>

      <Card>
        <form
          method="get"
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            marginBottom: 16,
          }}
        >
          <Field label="Search">
            <TextInput
              name="q"
              defaultValue={params.q}
              placeholder="Name, company, email"
            />
          </Field>
          <Field label="Status">
            <Select name="status" defaultValue={params.status ?? ""}>
              <option value="">All statuses</option>
              {LEAD_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {LEAD_STATUS_LABELS[status]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Industry">
            <TextInput name="industry" defaultValue={params.industry} />
          </Field>
          <Field label="Company">
            <TextInput name="company" defaultValue={params.company} />
          </Field>
          <Field label="Sort">
            <Select name="sort" defaultValue={params.sort ?? "createdAt"}>
              <option value="createdAt">Created date</option>
              <option value="name">Name</option>
              <option value="company">Company</option>
            </Select>
          </Field>
          <Field label="Order">
            <Select name="order" defaultValue={params.order ?? "desc"}>
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </Select>
          </Field>
          <div style={{ display: "flex", alignItems: "end" }}>
            <Button type="submit" variant="secondary">
              Apply filters
            </Button>
          </div>
        </form>

        {databaseUnreachable ? (
          <EmptyState
            title="Leads unavailable"
            description="Reconnect to the database to load your leads."
          />
        ) : !listed || listed.total === 0 ? (
          <EmptyState
            title="No leads yet"
            description="Add a lead manually or import a CSV. Discovery prospects stay under Prospects."
            action={
              <Link href="/leads/new">
                <Button>Add lead</Button>
              </Link>
            }
          />
        ) : listed.leads.length === 0 ? (
          <EmptyState
            title="No leads match these filters"
            description="Try clearing search or status filters."
          />
        ) : (
          <>
            <LeadsTable
              leads={listed.leads.map((lead) => ({
                ...lead,
                createdAt: lead.createdAt.toISOString(),
              }))}
            />
            {listed.pageCount > 1 ? (
              <p style={{ marginTop: 16, display: "flex", gap: 12 }}>
                {listed.page > 1 ? (
                  <Link
                    href={`/leads?${new URLSearchParams({
                      ...Object.fromEntries(
                        Object.entries({
                          q: params.q,
                          status: params.status,
                          industry: params.industry,
                          company: params.company,
                          sort: params.sort,
                          order: params.order,
                        }).filter(([, value]) => Boolean(value)),
                      ),
                      page: String(listed.page - 1),
                    }).toString()}`}
                  >
                    Previous
                  </Link>
                ) : null}
                <span>
                  Page {listed.page} of {listed.pageCount} · {listed.total}{" "}
                  total
                </span>
                {listed.page < listed.pageCount ? (
                  <Link
                    href={`/leads?${new URLSearchParams({
                      ...Object.fromEntries(
                        Object.entries({
                          q: params.q,
                          status: params.status,
                          industry: params.industry,
                          company: params.company,
                          sort: params.sort,
                          order: params.order,
                        }).filter(([, value]) => Boolean(value)),
                      ),
                      page: String(listed.page + 1),
                    }).toString()}`}
                  >
                    Next
                  </Link>
                ) : null}
              </p>
            ) : (
              <p style={{ marginTop: 12, color: "var(--muted)", fontSize: 13 }}>
                {listed.total} lead{listed.total === 1 ? "" : "s"}
              </p>
            )}
          </>
        )}
      </Card>
    </>
  );
}
