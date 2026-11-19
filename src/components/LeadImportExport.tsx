"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Banner } from "@/components/Banner";
import { Button } from "@/components/Button";

type ImportResult = {
  createdCount: number;
  duplicateCount: number;
  errorCount: number;
  duplicates: Array<{ rowNumber: number; message: string }>;
  errors: Array<{ rowNumber: number; message: string }>;
};

export function LeadImportExport({
  exportQuery,
}: {
  exportQuery: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<ImportResult | null>(null);

  async function onImport(file: File | null) {
    if (!file) {
      return;
    }
    setPending(true);
    setError(null);
    setMessage(null);
    setDetails(null);
    const body = new FormData();
    body.append("file", file);
    const response = await fetch("/api/v1/leads/import", {
      method: "POST",
      body,
    });
    const data = (await response.json()) as {
      error?: string;
      result?: ImportResult;
    };
    setPending(false);
    if (!response.ok) {
      setError(data.error ?? "Import failed.");
      return;
    }
    const result = data.result!;
    setDetails(result);
    setMessage(
      `Imported ${result.createdCount}. Duplicates skipped ${result.duplicateCount}. Row errors ${result.errorCount}.`,
    );
    router.refresh();
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0] ?? null;
            void onImport(file);
            event.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          onClick={() => inputRef.current?.click()}
        >
          {pending ? "Importing…" : "Import CSV"}
        </Button>
        <a href={`/api/v1/leads/export${exportQuery ? `?${exportQuery}` : ""}`}>
          <Button type="button" variant="secondary">
            Export CSV
          </Button>
        </a>
      </div>
      {message ? <Banner>{message}</Banner> : null}
      {error ? <Banner tone="error">{error}</Banner> : null}
      {details && (details.errors.length > 0 || details.duplicates.length > 0) ? (
        <Banner tone="warn">
          <div style={{ display: "grid", gap: 6 }}>
            <strong>Import details</strong>
            {[...details.duplicates, ...details.errors]
              .slice(0, 12)
              .map((item) => (
                <div key={`${item.rowNumber}-${item.message}`}>
                  Row {item.rowNumber}: {item.message}
                </div>
              ))}
            {details.errors.length + details.duplicates.length > 12 ? (
              <div>
                …and {details.errors.length + details.duplicates.length - 12}{" "}
                more.
              </div>
            ) : null}
          </div>
        </Banner>
      ) : null}
      <p style={{ color: "var(--muted)", fontSize: 13 }}>
        CSV columns: firstName, lastName, jobTitle, company, email, phone,
        linkedinUrl, website, industry, location, companySize, source, status,
        notes. Invalid rows are reported and not silently dropped.
      </p>
    </div>
  );
}
