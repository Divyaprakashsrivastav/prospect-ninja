"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/Button";

export function DiscoverButton({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function discover() {
    setPending(true);
    setMessage(null);
    const response = await fetch(`/api/v1/campaigns/${campaignId}/discover`, {
      method: "POST",
    });
    const data = (await response.json()) as {
      error?: string;
      result?: {
        added: number;
        skippedDuplicates: number;
        demo?: boolean;
      };
    };
    setPending(false);
    if (!response.ok) {
      setMessage(data.error ?? "Discovery failed.");
      return;
    }
    const extra = data.result?.demo
      ? " Demo provider — sample data only."
      : "";
    setMessage(
      `Added ${data.result?.added ?? 0} prospects (${data.result?.skippedDuplicates ?? 0} duplicates skipped).${extra}`,
    );
    router.refresh();
  }

  return (
    <div>
      <Button type="button" onClick={discover} disabled={pending}>
        {pending ? "Discovering…" : "Discover now"}
      </Button>
      {message ? (
        <p style={{ marginTop: 8, color: "var(--muted)" }}>{message}</p>
      ) : null}
    </div>
  );
}
