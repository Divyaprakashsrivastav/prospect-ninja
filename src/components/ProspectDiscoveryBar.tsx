"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/Button";
import { Select } from "@/components/Field";

type CampaignOption = { id: string; name: string; isActive: boolean };

export function ProspectDiscoveryBar({
  campaigns,
  selectedCampaignId,
}: {
  campaigns: CampaignOption[];
  selectedCampaignId?: string;
}) {
  const router = useRouter();
  const active = useMemo(
    () => campaigns.filter((campaign) => campaign.isActive),
    [campaigns],
  );
  const [campaignId, setCampaignId] = useState(
    selectedCampaignId && active.some((item) => item.id === selectedCampaignId)
      ? selectedCampaignId
      : (active[0]?.id ?? ""),
  );
  const [quota, setQuota] = useState<{
    used: number;
    remaining: number;
    limit: number;
  } | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!campaignId) {
      setQuota(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/v1/campaigns/${campaignId}/quota`)
      .then(async (response) => {
        const data = (await response.json()) as {
          quota?: { used: number; remaining: number; limit: number };
          error?: string;
        };
        if (!cancelled && response.ok && data.quota) {
          setQuota(data.quota);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setQuota(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  async function discover() {
    if (!campaignId) {
      setError("Select an active campaign first.");
      return;
    }
    setPending(true);
    setError(null);
    setMessage(null);
    const response = await fetch(`/api/v1/campaigns/${campaignId}/discover`, {
      method: "POST",
    });
    const data = (await response.json()) as {
      error?: string;
      result?: {
        added: number;
        skippedDuplicates: number;
        remainingAfter: number;
        dailyLimit: number;
        usedToday: number;
        demo?: boolean;
        emptyProvider?: boolean;
      };
    };
    setPending(false);
    if (!response.ok) {
      setError(data.error ?? "Discovery failed.");
      return;
    }
    if (data.result?.emptyProvider && data.result.added === 0) {
      setMessage("The provider returned no matching prospects for this ICP.");
    } else {
      const extra = data.result?.demo
        ? " Source: DEMO DATA — not real LinkedIn users."
        : "";
      setMessage(
        `Added ${data.result?.added ?? 0} new prospects. ${data.result?.skippedDuplicates ?? 0} duplicates skipped. ${data.result?.remainingAfter ?? 0} of ${data.result?.dailyLimit ?? 15} remaining today.${extra}`,
      );
    }
    if (data.result) {
      setQuota({
        used: data.result.usedToday,
        remaining: data.result.remainingAfter,
        limit: data.result.dailyLimit,
      });
    }
    router.push(`/prospects?campaignId=${campaignId}`);
    router.refresh();
  }

  return (
    <div
      style={{
        display: "grid",
        gap: 12,
        gridTemplateColumns: "minmax(220px, 1.4fr) auto",
        alignItems: "end",
      }}
    >
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>Campaign</span>
        <Select
          value={campaignId}
          onChange={(event) => setCampaignId(event.target.value)}
        >
          {active.length === 0 ? (
            <option value="">No active campaigns</option>
          ) : (
            active.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name}
              </option>
            ))
          )}
        </Select>
      </label>
      <div>
        <Button
          type="button"
          onClick={discover}
          disabled={pending || !campaignId}
        >
          {pending ? "Discovering…" : "Discover prospects"}
        </Button>
      </div>
      {quota ? (
        <p style={{ gridColumn: "1 / -1", color: "var(--muted)", fontSize: 14 }}>
          Daily quota: {quota.used} used / {quota.limit} max · {quota.remaining}{" "}
          new prospects remaining today
        </p>
      ) : null}
      {error ? (
        <p style={{ gridColumn: "1 / -1", color: "var(--danger)" }}>{error}</p>
      ) : null}
      {message ? (
        <p style={{ gridColumn: "1 / -1", color: "var(--muted)" }}>{message}</p>
      ) : null}
    </div>
  );
}
