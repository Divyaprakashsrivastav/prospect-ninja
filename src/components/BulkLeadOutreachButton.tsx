"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/Button";
import { Field, Select, TextArea } from "@/components/Field";
import {
  LEAD_MESSAGE_TYPE_LABELS,
  LEAD_MESSAGE_TYPES,
  type LeadMessageType,
} from "@/modules/lead-outreach/constants";

export function BulkLeadOutreachButton({ leadIds }: { leadIds: string[] }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [messageType, setMessageType] =
    useState<LeadMessageType>("professional");
  const [campaignContext, setCampaignContext] = useState("");

  async function generate() {
    if (leadIds.length === 0) {
      setError("Select one or more leads first.");
      return;
    }
    setPending(true);
    setError(null);
    setMessage(null);
    const response = await fetch("/api/v1/lead-outreach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadIds,
        messageType,
        campaignContext,
      }),
    });
    const data = (await response.json()) as {
      error?: string;
      result?: { succeeded: number; failed: number; skipped: number };
    };
    setPending(false);
    if (!response.ok) {
      setError(data.error ?? "Bulk generation failed.");
      return;
    }
    setMessage(
      `Generated ${data.result?.succeeded ?? 0}. Failed ${data.result?.failed ?? 0}. Skipped ${data.result?.skipped ?? 0} (already had this message type).`,
    );
    router.refresh();
  }

  return (
    <div style={{ display: "grid", gap: 8, minWidth: 240 }}>
      <Field label="Bulk message type">
        <Select
          value={messageType}
          onChange={(event) =>
            setMessageType(event.target.value as LeadMessageType)
          }
        >
          {LEAD_MESSAGE_TYPES.map((type) => (
            <option key={type} value={type}>
              {LEAD_MESSAGE_TYPE_LABELS[type]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Shared campaign context">
        <TextArea
          value={campaignContext}
          onChange={(event) => setCampaignContext(event.target.value)}
          rows={2}
        />
      </Field>
      <Button
        type="button"
        disabled={pending || leadIds.length === 0}
        onClick={generate}
      >
        {pending
          ? "Generating…"
          : `Generate for ${leadIds.length || 0} selected`}
      </Button>
      {error ? (
        <p style={{ color: "var(--danger)", fontSize: 13 }}>{error}</p>
      ) : null}
      {message ? (
        <p style={{ color: "var(--muted)", fontSize: 13 }}>{message}</p>
      ) : null}
    </div>
  );
}
