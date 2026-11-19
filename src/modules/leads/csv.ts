import {
  LEAD_STATUSES,
  leadInputSchema,
  type LeadInput,
  type LeadStatus,
} from "@/modules/leads/schema";

const CSV_HEADERS = [
  "firstName",
  "lastName",
  "jobTitle",
  "company",
  "email",
  "phone",
  "linkedinUrl",
  "website",
  "industry",
  "location",
  "companySize",
  "source",
  "status",
  "notes",
] as const;

export type CsvLeadRow = LeadInput & { rowNumber: number };

export type CsvParseResult = {
  valid: CsvLeadRow[];
  errors: Array<{ rowNumber: number; message: string; raw?: string }>;
};

function escapeCell(value: string | null | undefined): string {
  const text = value ?? "";
  if (/[",\n\r]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

export function leadsToCsv(
  leads: Array<Record<string, string | null | undefined>>,
): string {
  const lines = [CSV_HEADERS.join(",")];
  for (const lead of leads) {
    lines.push(
      CSV_HEADERS.map((key) => escapeCell(lead[key] ?? "")).join(","),
    );
  }
  return `${lines.join("\n")}\n`;
}

/** Minimal RFC4180-ish CSV parser (quoted fields, commas, newlines). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  const input = text.replace(/^\uFEFF/, "");

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    const next = input[i + 1];
    if (inQuotes) {
      if (char === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
      continue;
    }
    if (char === ",") {
      row.push(cell);
      cell = "";
      continue;
    }
    if (char === "\n" || (char === "\r" && next === "\n")) {
      row.push(cell);
      cell = "";
      if (row.some((value) => value.trim().length > 0)) {
        rows.push(row);
      }
      row = [];
      if (char === "\r" && next === "\n") {
        i += 1;
      }
      continue;
    }
    if (char === "\r") {
      row.push(cell);
      cell = "";
      if (row.some((value) => value.trim().length > 0)) {
        rows.push(row);
      }
      row = [];
      continue;
    }
    cell += char;
  }
  row.push(cell);
  if (row.some((value) => value.trim().length > 0)) {
    rows.push(row);
  }
  return rows;
}

function normalizeHeader(value: string): string {
  return value.trim().replace(/^\uFEFF/, "").toLowerCase();
}

const HEADER_ALIASES: Record<string, (typeof CSV_HEADERS)[number]> = {
  firstname: "firstName",
  first_name: "firstName",
  "first name": "firstName",
  lastname: "lastName",
  last_name: "lastName",
  "last name": "lastName",
  jobtitle: "jobTitle",
  job_title: "jobTitle",
  title: "jobTitle",
  company: "company",
  email: "email",
  phone: "phone",
  linkedinurl: "linkedinUrl",
  linkedin: "linkedinUrl",
  linkedin_url: "linkedinUrl",
  website: "website",
  industry: "industry",
  location: "location",
  companysize: "companySize",
  company_size: "companySize",
  source: "source",
  status: "status",
  notes: "notes",
};

function mapStatus(raw: string | undefined): LeadStatus | undefined {
  if (!raw) {
    return undefined;
  }
  const normalized = raw.trim().toLowerCase().replaceAll(" ", "_");
  if ((LEAD_STATUSES as readonly string[]).includes(normalized)) {
    return normalized as LeadStatus;
  }
  const byLabel = LEAD_STATUSES.find(
    (status) => status.replaceAll("_", " ") === raw.trim().toLowerCase(),
  );
  return byLabel;
}

export function parseLeadCsv(text: string): CsvParseResult {
  const table = parseCsv(text);
  if (table.length === 0) {
    return {
      valid: [],
      errors: [{ rowNumber: 0, message: "CSV file is empty." }],
    };
  }

  const headerRow = table[0].map(normalizeHeader);
  const indexByField = new Map<(typeof CSV_HEADERS)[number], number>();
  headerRow.forEach((header, index) => {
    const field = HEADER_ALIASES[header] ?? HEADER_ALIASES[header.replaceAll(" ", "_")];
    if (field) {
      indexByField.set(field, index);
    }
  });

  if (!indexByField.has("firstName") || !indexByField.has("lastName")) {
    return {
      valid: [],
      errors: [
        {
          rowNumber: 1,
          message:
            "CSV must include firstName and lastName columns (or First Name / Last Name).",
        },
      ],
    };
  }

  const valid: CsvLeadRow[] = [];
  const errors: CsvParseResult["errors"] = [];

  for (let i = 1; i < table.length; i += 1) {
    const rowNumber = i + 1;
    const cells = table[i];
    const get = (field: (typeof CSV_HEADERS)[number]) => {
      const index = indexByField.get(field);
      return index == null ? "" : (cells[index] ?? "").trim();
    };

    const statusRaw = get("status");
    const status = mapStatus(statusRaw);
    if (statusRaw && !status) {
      errors.push({
        rowNumber,
        message: `Invalid status "${statusRaw}". Use: ${LEAD_STATUSES.join(", ")}.`,
      });
      continue;
    }

    const candidate = {
      firstName: get("firstName"),
      lastName: get("lastName"),
      jobTitle: get("jobTitle"),
      company: get("company"),
      email: get("email") || undefined,
      phone: get("phone") || undefined,
      linkedinUrl: get("linkedinUrl") || undefined,
      website: get("website") || undefined,
      industry: get("industry"),
      location: get("location"),
      companySize: get("companySize"),
      source: get("source") || "csv",
      status: status ?? "new",
      notes: get("notes"),
    };

    const parsed = leadInputSchema.safeParse(candidate);
    if (!parsed.success) {
      errors.push({
        rowNumber,
        message: parsed.error.issues.map((issue) => issue.message).join(" "),
      });
      continue;
    }
    valid.push({ ...parsed.data, rowNumber });
  }

  return { valid, errors };
}
