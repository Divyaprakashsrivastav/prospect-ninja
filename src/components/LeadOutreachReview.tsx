"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Banner } from "@/components/Banner";
import { Button } from "@/components/Button";
import { Field, TextArea } from "@/components/Field";
import { LEAD_OUTREACH_STATUS } from "@/modules/lead-outreach/constants";

export function LeadOutreachReview({
  id,
  body,
  status,
  campaignContext,
  messageType,
}: {
  id: string;
  body: string;
  status: string;
  campaignContext: string;
  messageType: string;
}) {
  const router = useRouter();
  const [text, setText] = useState(body);
  const [context, setContext] = useState(campaignContext);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const locked =
    status === LEAD_OUTREACH_STATUS.sent ||
    status === LEAD_OUTREACH_STATUS.replied;

  async function call(path: string, method = "POST", payload?: unknown) {
    setPending(true);
    setError(null);
    setInfo(null);
    const response = await fetch(path, {
      method,
      headers: payload ? { "Content-Type": "application/json" } : undefined,
      body: payload ? JSON.stringify(payload) : undefined,
    });
    const data = (await response.json()) as {
      error?: string;
      outreach?: { status: string; body?: string };
    };
    setPending(false);
    if (!response.ok) {
      setError(data.error ?? "Request failed.");
      return;
    }
    if (data.outreach?.body) {
      setText(data.outreach.body);
    }
    if (path.includes("mark-sent")) {
      setInfo(
        "Marked as sent for tracking only. Prospect Ninja did not send this on LinkedIn.",
      );
    }
    router.refresh();
  }

  return (
    <div>
      {error ? <Banner tone="error">{error}</Banner> : null}
      {info ? <Banner tone="warn">{info}</Banner> : null}
      <Banner>
        Messages are never sent automatically. Approve, then copy or mark status
        manually. LinkedIn automation is not implemented.
      </Banner>
      <Field label="Campaign context used for AI">
        <TextArea
          value={context}
          onChange={(event) => setContext(event.target.value)}
          disabled={locked || pending}
          rows={3}
        />
      </Field>
      <Field label="Outreach draft">
        <TextArea
          value={text}
          onChange={(event) => setText(event.target.value)}
          disabled={locked || pending}
          rows={10}
        />
      </Field>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Button
          type="button"
          variant="secondary"
          disabled={locked || pending}
          onClick={() =>
            call(`/api/v1/lead-outreach/${id}`, "PATCH", { body: text })
          }
        >
          Save edit
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={locked || pending}
          onClick={() => {
            if (
              !window.confirm(
                "Replace this draft with a new AI generation? Edited or approved drafts need confirmation.",
              )
            ) {
              return;
            }
            void call(`/api/v1/lead-outreach/${id}/generate`, "POST", {
              replaceExisting: true,
              campaignContext: context,
              messageType,
            });
          }}
        >
          Regenerate
        </Button>
        <Button
          type="button"
          disabled={locked || pending}
          onClick={() => call(`/api/v1/lead-outreach/${id}/approve`)}
        >
          Approve
        </Button>
        <Button
          type="button"
          variant="danger"
          disabled={locked || pending}
          onClick={() => call(`/api/v1/lead-outreach/${id}/reject`)}
        >
          Reject
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={pending || status !== LEAD_OUTREACH_STATUS.approved}
          onClick={() => call(`/api/v1/lead-outreach/${id}/mark-sent`)}
        >
          Mark sent (manual)
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={
            pending ||
            (status !== LEAD_OUTREACH_STATUS.sent &&
              status !== LEAD_OUTREACH_STATUS.approved)
          }
          onClick={() => call(`/api/v1/lead-outreach/${id}/mark-replied`)}
        >
          Mark replied
        </Button>
      </div>
      <p style={{ color: "var(--muted)", marginTop: 10, fontSize: 13 }}>
        Editing clears approval. Mark sent / replied are tracking statuses only.
      </p>
    </div>
  );
}
