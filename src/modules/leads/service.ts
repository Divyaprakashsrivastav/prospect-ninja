import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { OwnershipError, assertOwned } from "@/lib/ownership";
import {
  leadBulkDeleteSchema,
  leadInputSchema,
  leadListQuerySchema,
  leadStatusUpdateSchema,
  type LeadInput,
  type LeadListQuery,
} from "@/modules/leads/schema";
import { leadsToCsv, parseLeadCsv, type CsvParseResult } from "@/modules/leads/csv";

function buildWhere(
  userId: string,
  filters: Pick<LeadListQuery, "q" | "status" | "industry" | "company">,
): Prisma.LeadWhereInput {
  return {
    userId,
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.industry
      ? { industry: { contains: filters.industry, mode: "insensitive" } }
      : {}),
    ...(filters.company
      ? { company: { contains: filters.company, mode: "insensitive" } }
      : {}),
    ...(filters.q
      ? {
          OR: [
            { firstName: { contains: filters.q, mode: "insensitive" } },
            { lastName: { contains: filters.q, mode: "insensitive" } },
            { company: { contains: filters.q, mode: "insensitive" } },
            { email: { contains: filters.q, mode: "insensitive" } },
            { industry: { contains: filters.q, mode: "insensitive" } },
            { jobTitle: { contains: filters.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
}

function orderBy(
  sort: LeadListQuery["sort"],
  order: LeadListQuery["order"],
): Prisma.LeadOrderByWithRelationInput[] {
  if (sort === "name") {
    return [{ firstName: order }, { lastName: order }];
  }
  if (sort === "company") {
    return [{ company: order }, { firstName: "asc" }];
  }
  return [{ createdAt: order }];
}

export async function listLeads(userId: string, rawQuery: unknown = {}) {
  const query = leadListQuerySchema.parse(rawQuery);
  const where = buildWhere(userId, query);
  const [total, leads] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.findMany({
      where,
      orderBy: orderBy(query.sort, query.order),
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);
  return {
    leads,
    total,
    page: query.page,
    pageSize: query.pageSize,
    pageCount: Math.max(Math.ceil(total / query.pageSize), 1),
  };
}

export async function getLead(userId: string, id: string) {
  return prisma.lead.findFirst({ where: { id, userId } });
}

export async function getLeadStats(userId: string) {
  const [total, newCount, contacted, qualified, converted] = await Promise.all([
    prisma.lead.count({ where: { userId } }),
    prisma.lead.count({ where: { userId, status: "new" } }),
    prisma.lead.count({ where: { userId, status: "contacted" } }),
    prisma.lead.count({ where: { userId, status: "qualified" } }),
    prisma.lead.count({ where: { userId, status: "converted" } }),
  ]);
  return { total, new: newCount, contacted, qualified, converted };
}

async function findDuplicate(
  userId: string,
  input: Pick<LeadInput, "email" | "linkedinUrl">,
  excludeId?: string,
) {
  if (input.email) {
    const byEmail = await prisma.lead.findFirst({
      where: {
        userId,
        email: input.email,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
    if (byEmail) {
      return { field: "email" as const, lead: byEmail };
    }
  }
  if (input.linkedinUrl) {
    const byLinkedIn = await prisma.lead.findFirst({
      where: {
        userId,
        linkedinUrl: input.linkedinUrl,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
    if (byLinkedIn) {
      return { field: "linkedinUrl" as const, lead: byLinkedIn };
    }
  }
  return null;
}

export async function createLead(userId: string, input: unknown) {
  const data = leadInputSchema.parse(input);
  const duplicate = await findDuplicate(userId, data);
  if (duplicate) {
    throw new Error(
      `A lead with this ${duplicate.field === "email" ? "email" : "LinkedIn URL"} already exists.`,
    );
  }
  return prisma.lead.create({
    data: {
      userId,
      firstName: data.firstName,
      lastName: data.lastName,
      jobTitle: data.jobTitle,
      company: data.company,
      email: data.email ?? null,
      phone: data.phone ?? null,
      linkedinUrl: data.linkedinUrl ?? null,
      website: data.website ?? null,
      industry: data.industry,
      location: data.location,
      companySize: data.companySize,
      source: data.source,
      status: data.status,
      notes: data.notes,
    },
  });
}

export async function updateLead(userId: string, id: string, input: unknown) {
  assertOwned(await getLead(userId, id), "Lead not found.");
  const data = leadInputSchema.parse(input);
  const duplicate = await findDuplicate(userId, data, id);
  if (duplicate) {
    throw new Error(
      `Another lead already uses this ${duplicate.field === "email" ? "email" : "LinkedIn URL"}.`,
    );
  }
  return prisma.lead.update({
    where: { id },
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      jobTitle: data.jobTitle,
      company: data.company,
      email: data.email ?? null,
      phone: data.phone ?? null,
      linkedinUrl: data.linkedinUrl ?? null,
      website: data.website ?? null,
      industry: data.industry,
      location: data.location,
      companySize: data.companySize,
      source: data.source,
      status: data.status,
      notes: data.notes,
    },
  });
}

export async function updateLeadStatus(userId: string, id: string, input: unknown) {
  assertOwned(await getLead(userId, id), "Lead not found.");
  const { status } = leadStatusUpdateSchema.parse(input);
  return prisma.lead.update({ where: { id }, data: { status } });
}

export async function deleteLead(userId: string, id: string) {
  assertOwned(await getLead(userId, id), "Lead not found.");
  await prisma.lead.delete({ where: { id } });
}

export async function bulkDeleteLeads(userId: string, input: unknown) {
  const { ids } = leadBulkDeleteSchema.parse(input);
  const owned = await prisma.lead.findMany({
    where: { userId, id: { in: ids } },
    select: { id: true },
  });
  const ownedIds = owned.map((lead) => lead.id);
  if (ownedIds.length === 0) {
    throw new OwnershipError("No matching leads found.");
  }
  const result = await prisma.lead.deleteMany({
    where: { userId, id: { in: ownedIds } },
  });
  return {
    deleted: result.count,
    skipped: ids.length - ownedIds.length,
  };
}

export async function importLeadsFromCsv(userId: string, csvText: string) {
  const parsed = parseLeadCsv(csvText);
  const created: string[] = [];
  const duplicates: CsvParseResult["errors"] = [];
  const failures = [...parsed.errors];

  for (const row of parsed.valid) {
    const duplicate = await findDuplicate(userId, row);
    if (duplicate) {
      duplicates.push({
        rowNumber: row.rowNumber,
        message: `Duplicate ${duplicate.field === "email" ? "email" : "LinkedIn URL"} — not imported.`,
      });
      continue;
    }
    try {
      const lead = await createLead(userId, { ...row, source: row.source || "csv" });
      created.push(lead.id);
    } catch (error) {
      failures.push({
        rowNumber: row.rowNumber,
        message: error instanceof Error ? error.message : "Import failed for this row.",
      });
    }
  }

  return {
    createdCount: created.length,
    createdIds: created,
    duplicateCount: duplicates.length,
    duplicates,
    errorCount: failures.length,
    errors: failures,
    validRowCount: parsed.valid.length,
  };
}

export async function exportLeadsCsv(userId: string, rawQuery: unknown = {}) {
  const query = leadListQuerySchema.parse({
    ...(typeof rawQuery === "object" && rawQuery ? rawQuery : {}),
    page: 1,
    pageSize: 50,
  });
  const where = buildWhere(userId, query);
  const leads = await prisma.lead.findMany({
    where,
    orderBy: orderBy(query.sort, query.order),
    take: 5000,
  });
  return leadsToCsv(
    leads.map((lead) => ({
      firstName: lead.firstName,
      lastName: lead.lastName,
      jobTitle: lead.jobTitle,
      company: lead.company,
      email: lead.email,
      phone: lead.phone,
      linkedinUrl: lead.linkedinUrl,
      website: lead.website,
      industry: lead.industry,
      location: lead.location,
      companySize: lead.companySize,
      source: lead.source,
      status: lead.status,
      notes: lead.notes,
    })),
  );
}
