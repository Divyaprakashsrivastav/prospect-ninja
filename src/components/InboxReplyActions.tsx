"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "@/app/(app)/inbox/inbox.module.css";
import { Button } from "@/components/Button";
import { TextArea } from "@/components/Field";
import { IconMessage } from "@/components/icons";
import {
  INBOX_STATUS_LABELS,
  INBOX_STATUSES,
  type InboxStatus,
} from "@/modules/inbox/constants";

export function InboxReplyActions({
  eventId,
  firstName,
  status: savedStatus,
}: {
  eventId: string;
  firstName: string;
  status: InboxStatus | null;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<InboxStatus | null>(savedStatus);
  const [statusPending, setStatusPending] = useState(false);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  /** Clicking the active status clears it. */
  async function changeStatus(next: InboxStatus) {
    const value = status === next ? null : next;
    const previous = status;
    setStatus(value);
    setStatusPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/v1/inbox/${encodeURIComponent(eventId)}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: value }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        setStatus(previous);
        setError(data.error ?? "Could not save the status.");
        return;
      }
      // Status is per person, so other cards and the tab counts change too.
      router.refresh();
    } catch {
      setStatus(previous);
      setError("Network error. Try again.");
    } finally {
      setStatusPending(false);
    }
  }

  async function send() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/v1/inbox/${encodeURIComponent(eventId)}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Could not send the reply.");
        return;
      }
      setText("");
      setOpen(false);
      setSent(true);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <div className={styles.actions}>
        {INBOX_STATUSES.map((value) => (
          <Button
            key={value}
            type="button"
            variant={status === value ? "primary" : "secondary"}
            aria-pressed={status === value}
            disabled={statusPending}
            onClick={() => changeStatus(value)}
          >
            {INBOX_STATUS_LABELS[value]}
          </Button>
        ))}
        <Button
          type="button"
          variant="ghost"
          className={styles.replyButton}
          onClick={() => {
            setOpen((value) => !value);
            setSent(false);
          }}
          aria-expanded={open}
        >
          <IconMessage size={18} />
          Reply
        </Button>
      </div>

      {sent ? <p className={styles.sent}>Reply sent on LinkedIn.</p> : null}
      {error && !open ? <p className={styles.error}>{error}</p> : null}

      {open ? (
        <div className={styles.replyBox}>
          <TextArea
            rows={4}
            value={text}
            placeholder={`Reply to ${firstName}…`}
            onChange={(event) => setText(event.target.value)}
            disabled={pending}
            autoFocus
          />
          {error ? <p className={styles.error}>{error}</p> : null}
          <div className={styles.replyFooter}>
            <span>Sends from your linked LinkedIn account.</span>
            <div className={styles.replyButtons}>
              <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
                Cancel
              </Button>
              <Button type="button" onClick={send} disabled={pending || text.trim().length === 0}>
                {pending ? "Sending…" : "Send reply"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
