"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Banner } from "@/components/Banner";
import { Button } from "@/components/Button";

export type LinkedInConnection = {
  configured: boolean;
  status: string;
  displayName: string | null;
  lastError: string | null;
  live: boolean;
};

export function ConnectLinkedInPanel({
  initial,
  result,
  reason,
  showSkip = true,
}: {
  initial: LinkedInConnection;
  /** `?result=success|failure` set by our Hosted Auth callback. */
  result?: string;
  /** `?reason=` explaining a failure. */
  reason?: string;
  showSkip?: boolean;
}) {
  const router = useRouter();
  const [connection, setConnection] = useState(initial);
  const [error, setError] = useState<string | null>(
    result === "failure"
      ? `LinkedIn was not linked${reason ? `: ${reason}` : "."} Try again.`
      : null,
  );
  const [pending, setPending] = useState(false);

  async function startLink(type: "create" | "reconnect") {
    setPending(true);
    setError(null);
    const response = await fetch("/api/v1/integrations/unipile/link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
    });
    const data = (await response.json()) as { url?: string; error?: string };
    if (!response.ok || !data.url) {
      setPending(false);
      setError(data.error ?? "Could not start LinkedIn linking.");
      return;
    }
    window.location.assign(data.url);
  }

  async function disconnect() {
    if (!window.confirm("Disconnect your LinkedIn account? Sends will be simulated until you link again.")) {
      return;
    }
    setPending(true);
    setError(null);
    const response = await fetch("/api/v1/integrations/unipile", { method: "DELETE" });
    const data = (await response.json()) as {
      connection?: LinkedInConnection;
      error?: string;
    };
    setPending(false);
    if (!response.ok || !data.connection) {
      setError(data.error ?? "Could not disconnect.");
      return;
    }
    setConnection(data.connection);
    router.refresh();
  }

  if (!connection.configured) {
    return (
      <Banner tone="warn">
        LinkedIn linking isn&apos;t configured on this server (UNIPILE_API_KEY).
        Messages will be simulated.
      </Banner>
    );
  }

  return (
    <div>
      {error ? <Banner tone="error">{error}</Banner> : null}

      {connection.live ? (
        <>
          <Banner>
            Connected
            {connection.displayName ? ` as ${connection.displayName}` : ""}.
            Approved messages are sent from your LinkedIn account.
          </Banner>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link href="/dashboard">
              <Button type="button">Continue</Button>
            </Link>
            <Button type="button" variant="ghost" disabled={pending} onClick={disconnect}>
              Disconnect
            </Button>
          </div>
        </>
      ) : connection.status === "needs_reconnect" ? (
        <>
          <Banner tone="warn">
            Your LinkedIn session expired. Reconnect to keep sending.
          </Banner>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button type="button" disabled={pending} onClick={() => startLink("reconnect")}>
              {pending ? "Opening…" : "Reconnect LinkedIn"}
            </Button>
            <Button type="button" variant="ghost" disabled={pending} onClick={disconnect}>
              Disconnect
            </Button>
          </div>
        </>
      ) : (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <Button
            type="button"
            disabled={pending}
            onClick={() => startLink("create")}
          >
            {pending ? "Opening…" : "Connect LinkedIn"}
          </Button>
          {showSkip ? (
            <Link href="/dashboard" style={{ color: "var(--muted)" }}>
              Skip for now
            </Link>
          ) : null}
        </div>
      )}
    </div>
  );
}
