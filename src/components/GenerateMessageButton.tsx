"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/Button";

export function GenerateMessageButton({
  prospectId,
  hasDraft,
}: {
  prospectId: string;
  hasDraft: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    if (
      hasDraft &&
      !window.confirm(
        "Replace the existing draft? Edited or approved drafts cannot be overwritten.",
      )
    ) {
      return;
    }
    setPending(true);
    setError(null);
    const response = await fetch(`/api/v1/prospects/${prospectId}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ replaceExisting: hasDraft }),
    });
    const data = (await response.json()) as { error?: string };
    setPending(false);
    if (!response.ok) {
      setError(data.error ?? "Generation failed.");
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <Button
        type="button"
        variant="secondary"
        disabled={pending}
        aria-busy={pending}
        onClick={generate}
      >
        {pending ? "Generating…" : hasDraft ? "Regenerate" : "Generate message"}
      </Button>
      {pending ? (
        <p style={{ color: "var(--muted)", fontSize: 12, marginTop: 4 }}>
          Building a personalized draft…
        </p>
      ) : null}
      {error ? (
        <p style={{ color: "var(--danger)", fontSize: 12, marginTop: 4 }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
