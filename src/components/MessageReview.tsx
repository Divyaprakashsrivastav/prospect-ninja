"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Banner } from "@/components/Banner";
import { Button } from "@/components/Button";
import { Field, TextArea } from "@/components/Field";
import { MESSAGE_STATUS } from "@/modules/outreach/constants";

/** LinkedIn's limit for the note on a connection request. */
const INVITATION_NOTE_LIMIT = 300;

export function MessageReview({
  id,
  body,
  status,
  linkedinLive,
}: {
  id: string;
  body: string;
  status: string;
  /**
   * Whether the user has a working Unipile LinkedIn account. When undefined
   * (callers that don't check), the Send hints are left out.
   */
  linkedinLive?: boolean;
}) {
  const router = useRouter();
  const [text, setText] = useState(body);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const locked =
    status === MESSAGE_STATUS.sent ||
    status === MESSAGE_STATUS.invitationSent ||
    status === MESSAGE_STATUS.demoRecorded;
  const noteLength = Array.from(text).length;

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
      message?: { status: string };
    };
    setPending(false);
    if (!response.ok) {
      setError(data.error ?? "Request failed.");
      return;
    }
    if (data.message?.status === MESSAGE_STATUS.demoRecorded) {
      setInfo("Not sent — demo provider. The attempt was recorded only.");
    } else if (data.message?.status === MESSAGE_STATUS.invitationSent) {
      setInfo(
        "You're not connected yet, so this went out as a connection request with your message as the note.",
      );
    } else if (data.message?.status === MESSAGE_STATUS.sent) {
      setInfo("Sent on LinkedIn.");
    }
    router.refresh();
  }

  return (
    <div>
      {error ? <Banner tone="error">{error}</Banner> : null}
      {info ? <Banner tone="warn">{info}</Banner> : null}
      {status === MESSAGE_STATUS.demoRecorded ? (
        <Banner tone="warn">Not sent — demo provider.</Banner>
      ) : null}
      {status === MESSAGE_STATUS.invitationSent && !info ? (
        <Banner>Sent as a LinkedIn connection request with this note.</Banner>
      ) : null}
      {status === MESSAGE_STATUS.sent && !info ? (
        <Banner>Sent on LinkedIn.</Banner>
      ) : null}
      {linkedinLive === false && !locked ? (
        <Banner tone="warn">
          LinkedIn isn&apos;t linked, so Send only records a simulated send.{" "}
          <Link href="/connect-linkedin">Connect LinkedIn</Link>
        </Banner>
      ) : null}
      <Field label="Outreach draft">
        <TextArea
          value={text}
          onChange={(event) => setText(event.target.value)}
          disabled={locked || pending}
        />
      </Field>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Button
          type="button"
          variant="secondary"
          disabled={locked || pending}
          onClick={() => call(`/api/v1/messages/${id}`, "PATCH", { body: text })}
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
                "Replace the existing draft? Edited or approved drafts cannot be overwritten.",
              )
            ) {
              return;
            }
            void call(`/api/v1/messages/${id}/generate`, "POST", {
              replaceExisting: true,
            });
          }}
        >
          Regenerate
        </Button>
        <Button
          type="button"
          disabled={locked || pending}
          onClick={() => call(`/api/v1/messages/${id}/approve`)}
        >
          Approve
        </Button>
        <Button
          type="button"
          variant="danger"
          disabled={locked || pending}
          onClick={() => call(`/api/v1/messages/${id}/reject`)}
        >
          Reject
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={pending || status !== MESSAGE_STATUS.approved}
          onClick={() => call(`/api/v1/messages/${id}/send`)}
        >
          Send
        </Button>
      </div>
      <p style={{ color: "var(--muted)", marginTop: 10, fontSize: 13 }}>
        Send stays disabled until this exact body is approved. Editing clears
        approval.
        {linkedinLive ? (
          <>
            {" "}
            Connections get a direct message. Anyone else gets a connection
            request with this as the note, which must be{" "}
            {INVITATION_NOTE_LIMIT} characters or fewer (currently{" "}
            <span
              style={{
                color:
                  noteLength > INVITATION_NOTE_LIMIT ? "var(--danger)" : undefined,
              }}
            >
              {noteLength}
            </span>
            ).
          </>
        ) : null}
      </p>
    </div>
  );
}
