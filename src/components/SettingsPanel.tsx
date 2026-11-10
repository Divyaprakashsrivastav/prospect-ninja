"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { logoutAction } from "@/app/actions/auth";
import { Banner } from "@/components/Banner";
import { Button } from "@/components/Button";

type Connection = {
  provider: string;
  status: string;
  label: string;
  liveSendAllowed: boolean;
};

export function SettingsPanel({ connections }: { connections: Connection[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function select(provider: "demo" | "heyreach") {
    setError(null);
    const response = await fetch("/api/v1/integrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider }),
    });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(data.error ?? "Could not update provider.");
      return;
    }
    router.refresh();
  }

  return (
    <div>
      {error ? <Banner tone="error">{error}</Banner> : null}
      {connections.map((connection) => (
        <div
          key={connection.provider}
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            padding: "12px 0",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div>
            <strong>{connection.label}</strong>
            <div style={{ color: "var(--muted)", fontSize: 13 }}>
              Status: {connection.status.replaceAll("_", " ")}
              {connection.provider === "demo"
                ? " · sample data only"
                : connection.liveSendAllowed
                  ? " · live send enabled"
                  : " · waiting for official API credentials"}
            </div>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              select(connection.provider === "heyreach" ? "heyreach" : "demo")
            }
          >
            Use this
          </Button>
        </div>
      ))}
      <form action={logoutAction} style={{ marginTop: 20 }}>
        <Button type="submit" variant="ghost">
          Sign out
        </Button>
      </form>
    </div>
  );
}
