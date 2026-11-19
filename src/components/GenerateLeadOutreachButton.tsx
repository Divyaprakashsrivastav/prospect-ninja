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

export function GenerateLeadOutreachButton({
  leadId,
  hasDraft = false,
}: {
  leadId: string;
  hasDraft?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messageType, setMessageType] =
    useState<LeadMessageType>("professional");
  const [campaignContext, setCampaignContext] = useState("");

  async function generate() {
    if (
      hasDraft &&
      !window.confirm(
        "Replace the existing outreach draft for this message type?",
      )
    ) {
      return;
    }
    setPending(true);
    setError(null);
    const response = await fetch(`/api/v1/leads/${leadId}/outreach`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messageType,
        campaignContext,
        replaceExisting: hasDraft,
      }),
    });
    const data = (await response.json()) as {
      error?: string;
      outreach?: { id: string };
    };
    setPending(false);
    if (!response.ok) {
      setError(data.error ?? "Generation failed.");
      return;
    }
    router.push(`/outreach/${data.outreach!.id}`);
    router.refresh();
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <Field label="Message type">
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
      <Field
        label="Campaign context"
        hint="Optional product or objective text for the AI. Do not use placeholder copy."
      >
        <TextArea
          value={campaignContext}
          onChange={(event) => setCampaignContext(event.target.value)}
          rows={3}
          placeholder="What you offer and why you are reaching out"
        />
      </Field>
      <Button type="button" disabled={pending} onClick={generate}>
        {pending
          ? "Generating…"
          : hasDraft
            ? "Regenerate AI message"
            : "Generate AI message"}
      </Button>
      {error ? (
        <p style={{ color: "var(--danger)", fontSize: 12 }}>{error}</p>
      ) : null}
    </div>
  );
}
