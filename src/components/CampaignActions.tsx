"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/Button";

export function CampaignActions({
  campaignId,
  isActive,
}: {
  campaignId: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setPending(true);
    setError(null);
    const response = await fetch(`/api/v1/campaigns/${campaignId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    const data = (await response.json()) as { error?: string };
    setPending(false);
    if (!response.ok) {
      setError(data.error ?? "Could not update campaign.");
      return;
    }
    router.refresh();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <Button
        type="button"
        variant="secondary"
        disabled={pending}
        onClick={toggle}
      >
        {pending ? "Updating…" : isActive ? "Pause" : "Resume"}
      </Button>
      {error ? (
        <span style={{ color: "var(--danger)", fontSize: 12 }}>{error}</span>
      ) : null}
    </div>
  );
}
