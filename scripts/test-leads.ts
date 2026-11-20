import { prisma } from "../src/lib/db";
import { parseLeadCsv, leadsToCsv } from "../src/modules/leads/csv";
import {
  bulkDeleteLeads,
  createLead,
  deleteLead,
  exportLeadsCsv,
  getLead,
  getLeadStats,
  importLeadsFromCsv,
  listLeads,
  updateLead,
  updateLeadStatus,
} from "../src/modules/leads/service";

async function main() {
  const csvCheck = parseLeadCsv(`firstName,lastName,email,company,status
Amina,Cole,amina@example.com,Lumen Labs,new
,Broken,,Acme,new
Bad,Status,bad@example.com,Acme,bogus
`);
  if (csvCheck.valid.length !== 1) {
    throw new Error("CSV parser should accept one valid row.");
  }
  if (csvCheck.errors.length < 2) {
    throw new Error("CSV parser should report invalid rows.");
  }

  const suffix = Date.now().toString();
  const owner = await prisma.user.create({
    data: {
      email: `leads-owner-${suffix}@example.com`,
      name: "Leads Owner",
      passwordHash: "test-hash",
    },
  });
  const other = await prisma.user.create({
    data: {
      email: `leads-other-${suffix}@example.com`,
      name: "Leads Other",
      passwordHash: "test-hash",
    },
  });

  const lead = await createLead(owner.id, {
    firstName: "Amina",
    lastName: "Cole",
    jobTitle: "CEO",
    company: "Lumen Labs",
    email: `amina-${suffix}@example.com`,
    industry: "SaaS",
    status: "new",
    source: "manual",
  });

  try {
    await createLead(owner.id, {
      firstName: "Copy",
      lastName: "Cole",
      email: `amina-${suffix}@example.com`,
      company: "Other Co",
    });
    throw new Error("Duplicate email should be rejected.");
  } catch (error) {
    if (!(error instanceof Error) || !/email already exists/i.test(error.message)) {
      throw error;
    }
  }

  const listed = await listLeads(owner.id, {
    q: "Amina",
    status: "new",
    company: "Lumen",
    sort: "name",
    order: "asc",
  });
  if (!listed.leads.some((item) => item.id === lead.id)) {
    throw new Error("Search/filter missed the created lead.");
  }

  const hidden = await getLead(other.id, lead.id);
  if (hidden) {
    throw new Error("Other user must not read owner lead.");
  }

  const updated = await updateLead(owner.id, lead.id, {
    firstName: "Amina",
    lastName: "Cole",
    jobTitle: "Founder",
    company: "Lumen Labs",
    email: `amina-${suffix}@example.com`,
    industry: "SaaS",
    status: "contacted",
    source: "manual",
    notes: "Follow up next week",
  });
  if (updated.jobTitle !== "Founder" || updated.status !== "contacted") {
    throw new Error("Lead update did not persist.");
  }

  await updateLeadStatus(owner.id, lead.id, { status: "qualified" });
  const stats = await getLeadStats(owner.id);
  if (stats.total < 1 || stats.qualified < 1) {
    throw new Error("Lead stats must reflect real records.");
  }
  const otherStats = await getLeadStats(other.id);
  if (otherStats.total !== 0) {
    throw new Error("Other user stats leaked owner leads.");
  }

  const importResult = await importLeadsFromCsv(
    owner.id,
    `firstName,lastName,email,company,status
Jordan,Lee,jordan-${suffix}@example.com,Northwind,new
Amina,Cole,amina-${suffix}@example.com,Lumen Labs,new
`,
  );
  if (importResult.createdCount !== 1 || importResult.duplicateCount !== 1) {
    throw new Error("Import should create one and skip one duplicate.");
  }

  const csv = await exportLeadsCsv(owner.id, { q: "Jordan" });
  if (!csv.includes("Jordan") || !csv.includes("firstName")) {
    throw new Error("Export CSV missing expected content.");
  }
  if (!leadsToCsv([{ firstName: "X", lastName: "Y" }]).includes("X")) {
    throw new Error("leadsToCsv helper failed.");
  }

  const second = await listLeads(owner.id, { q: "Jordan" });
  const bulk = await bulkDeleteLeads(owner.id, {
    ids: second.leads.map((item) => item.id),
  });
  if (bulk.deleted < 1) {
    throw new Error("Bulk delete should remove owned leads.");
  }

  await deleteLead(owner.id, lead.id);
  if (await getLead(owner.id, lead.id)) {
    throw new Error("Lead should be deleted.");
  }

  try {
    await deleteLead(other.id, lead.id);
    throw new Error("Other user should not delete missing/foreign lead.");
  } catch (error) {
    if (!(error instanceof Error) || !/not found/i.test(error.message)) {
      throw error;
    }
  }

  await prisma.user.deleteMany({
    where: { id: { in: [owner.id, other.id] } },
  });
  console.log("Lead management tests passed.");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
