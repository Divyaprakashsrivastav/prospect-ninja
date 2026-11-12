"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/Button";
import styles from "./BulkGenerateButton.module.css";

export function BulkGenerateButton({ campaignId }: { campaignId?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    if (!campaignId) {
      setError("Select a campaign filter first.");
      return;
    }
    setPending(true);
    setError(null);
    setMessage(null);
    const response = await fetch(
      `/api/v1/campaigns/${campaignId}/generate-messages`,
      { method: "POST" },
    );
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
      `Generated ${data.result?.succeeded ?? 0}. Failed ${data.result?.failed ?? 0}. Skipped ${data.result?.skipped ?? 0} (already drafted).`,
    );
    router.refresh();
  }

  return (
    <div className={styles.wrap}>
      <Button
        type="button"
        onClick={generate}
        disabled={pending || !campaignId}
        aria-busy={pending}
      >
        {pending ? "Generating messages…" : "Bulk generate messages"}
      </Button>
      {pending ? (
        <div className={styles.progress} role="progressbar" aria-label="Generating drafts">
          <span className={styles.bar} />
        </div>
      ) : null}
      {error ? <p className={styles.error}>{error}</p> : null}
      {message ? <p className={styles.note}>{message}</p> : null}
      {!campaignId ? (
        <p className={styles.note}>
          Filter by one campaign to bulk-generate drafts for prospects without an
          existing draft.
        </p>
      ) : null}
    </div>
  );
}
