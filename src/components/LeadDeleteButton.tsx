"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/Button";

export function LeadDeleteButton({
  leadId,
  label = "Delete lead",
}: {
  leadId: string;
  label?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    if (
      !window.confirm(
        "Delete this lead? This cannot be undone.",
      )
    ) {
      return;
    }
    setPending(true);
    setError(null);
    const response = await fetch(`/api/v1/leads/${leadId}`, { method: "DELETE" });
    const data = (await response.json()) as { error?: string };
    setPending(false);
    if (!response.ok) {
      setError(data.error ?? "Delete failed.");
      return;
    }
    router.push("/leads?deleted=1");
    router.refresh();
  }

  return (
    <div>
      <Button
        type="button"
        variant="danger"
        disabled={pending}
        onClick={onDelete}
      >
        {pending ? "Deleting…" : label}
      </Button>
      {error ? (
        <p style={{ color: "var(--danger)", fontSize: 12, marginTop: 6 }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
