"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Badge } from "@/components/Badge";
import { BulkLeadOutreachButton } from "@/components/BulkLeadOutreachButton";
import { Button } from "@/components/Button";
import tableStyles from "@/components/CampaignTable.module.css";
import { formatDateShort } from "@/lib/dates";
import {
  LEAD_STATUS_LABELS,
  leadFullName,
  type LeadStatus,
} from "@/modules/leads/schema";

type LeadRow = {
  id: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  company: string;
  email: string | null;
  industry: string;
  status: string;
  createdAt: string | Date;
};

export function LeadsTable({ leads }: { leads: LeadRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const allIds = useMemo(() => leads.map((lead) => lead.id), [leads]);
  const allSelected =
    allIds.length > 0 && allIds.every((id) => selected.includes(id));

  function toggleAll() {
    setSelected(allSelected ? [] : allIds);
  }

  function toggleOne(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  async function bulkDelete() {
    if (selected.length === 0) {
      return;
    }
    if (
      !window.confirm(
        `Delete ${selected.length} lead${selected.length === 1 ? "" : "s"}? This cannot be undone.`,
      )
    ) {
      return;
    }
    setPending(true);
    setError(null);
    const response = await fetch("/api/v1/leads/bulk-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: selected }),
    });
    const data = (await response.json()) as { error?: string };
    setPending(false);
    if (!response.ok) {
      setError(data.error ?? "Bulk delete failed.");
      return;
    }
    setSelected([]);
    router.refresh();
  }

  async function updateStatus(id: string, status: string) {
    setError(null);
    const response = await fetch(`/api/v1/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(data.error ?? "Could not update status.");
      return;
    }
    router.refresh();
  }

  if (leads.length === 0) {
    return null;
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 12,
          flexWrap: "wrap",
          alignItems: "start",
        }}
      >
        <div>
          <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 8 }}>
            {selected.length > 0
              ? `${selected.length} selected`
              : `${leads.length} on this page`}
          </p>
          <Button
            type="button"
            variant="danger"
            disabled={pending || selected.length === 0}
            onClick={bulkDelete}
          >
            {pending ? "Deleting…" : "Delete selected"}
          </Button>
        </div>
        <BulkLeadOutreachButton leadIds={selected} />
      </div>
      {error ? (
        <p style={{ color: "var(--danger)", fontSize: 13, marginBottom: 8 }}>
          {error}
        </p>
      ) : null}
      <div className={tableStyles.wrap}>
        <table className={tableStyles.table}>
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Select all leads on this page"
                />
              </th>
              <th>Name</th>
              <th>Company</th>
              <th>Industry</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selected.includes(lead.id)}
                    onChange={() => toggleOne(lead.id)}
                    aria-label={`Select ${leadFullName(lead)}`}
                  />
                </td>
                <td>
                  <Link href={`/leads/${lead.id}`}>
                    <strong>{leadFullName(lead)}</strong>
                  </Link>
                  <div className={tableStyles.muted}>
                    {lead.jobTitle || lead.email || "—"}
                  </div>
                </td>
                <td>{lead.company || "—"}</td>
                <td>{lead.industry || "—"}</td>
                <td>
                  <div style={{ display: "grid", gap: 6 }}>
                    <Badge status={lead.status}>
                      {LEAD_STATUS_LABELS[lead.status as LeadStatus] ??
                        lead.status}
                    </Badge>
                    <select
                      className="input"
                      value={lead.status}
                      onChange={(event) =>
                        updateStatus(lead.id, event.target.value)
                      }
                      style={{
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        padding: "4px 8px",
                        fontSize: 12,
                      }}
                      aria-label={`Status for ${leadFullName(lead)}`}
                    >
                      {Object.entries(LEAD_STATUS_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                </td>
                <td>{formatDateShort(lead.createdAt)}</td>
                <td>
                  <div className={tableStyles.actions}>
                    <Link href={`/leads/${lead.id}`}>View</Link>
                    <Link href={`/leads/${lead.id}/edit`}>Edit</Link>
                    <Link href={`/leads/${lead.id}/outreach`}>Outreach</Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
