"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/Button";
import { Field, TextInput } from "@/components/Field";
import type { Icp } from "@/modules/campaigns/schema";

function joinList(values: string[]): string {
  return values.join(", ");
}

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function CampaignForm({
  campaignId,
  initial,
}: {
  campaignId?: string;
  initial?: {
    name: string;
    isActive: boolean;
    dailyDiscoverLimit: number;
    icp: Icp;
  };
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const icp = initial?.icp;

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const payload = {
      name: String(formData.get("name") ?? ""),
      isActive: formData.get("isActive") === "on",
      dailyDiscoverLimit: Number(formData.get("dailyDiscoverLimit") ?? 15),
      icp: {
        jobTitles: splitList(String(formData.get("jobTitles") ?? "")),
        industries: splitList(String(formData.get("industries") ?? "")),
        locations: splitList(String(formData.get("locations") ?? "")),
        keywords: splitList(String(formData.get("keywords") ?? "")),
        exclusions: splitList(String(formData.get("exclusions") ?? "")),
        companySizeMin: formData.get("companySizeMin")
          ? Number(formData.get("companySizeMin"))
          : undefined,
        companySizeMax: formData.get("companySizeMax")
          ? Number(formData.get("companySizeMax"))
          : undefined,
      },
    };
    const response = await fetch(
      campaignId ? `/api/v1/campaigns/${campaignId}` : "/api/v1/campaigns",
      {
        method: campaignId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const data = (await response.json()) as {
      error?: string;
      campaign?: { id: string };
    };
    setPending(false);
    if (!response.ok) {
      setError(data.error ?? "Could not save campaign.");
      return;
    }
    router.push(campaignId ? `/targeting/${campaignId}` : "/targeting");
    router.refresh();
  }

  return (
    <form action={onSubmit}>
      {error ? (
        <p style={{ color: "var(--danger)", marginBottom: 12 }}>{error}</p>
      ) : null}
      <Field label="Campaign name">
        <TextInput name="name" required defaultValue={initial?.name} />
      </Field>
      <Field
        label="Job titles"
        hint="Comma-separated. Used to match demo sample data."
      >
        <TextInput
          name="jobTitles"
          defaultValue={joinList(icp?.jobTitles ?? [])}
          placeholder="VP of Sales, Head of Revenue Operations"
        />
      </Field>
      <Field label="Industries">
        <TextInput
          name="industries"
          defaultValue={joinList(icp?.industries ?? [])}
          placeholder="SaaS, Healthcare"
        />
      </Field>
      <Field label="Locations">
        <TextInput
          name="locations"
          defaultValue={joinList(icp?.locations ?? [])}
        />
      </Field>
      <Field label="Keywords">
        <TextInput
          name="keywords"
          defaultValue={joinList(icp?.keywords ?? [])}
        />
      </Field>
      <Field label="Exclusions">
        <TextInput
          name="exclusions"
          defaultValue={joinList(icp?.exclusions ?? [])}
        />
      </Field>
      <Field label="Company size min">
        <TextInput
          name="companySizeMin"
          type="number"
          min={1}
          defaultValue={icp?.companySizeMin}
        />
      </Field>
      <Field label="Company size max">
        <TextInput
          name="companySizeMax"
          type="number"
          min={1}
          defaultValue={icp?.companySizeMax}
        />
      </Field>
      <Field
        label="Daily discover limit"
        hint="Hard cap is 15 new prospects per campaign per day."
      >
        <TextInput
          name="dailyDiscoverLimit"
          type="number"
          min={1}
          max={15}
          defaultValue={initial?.dailyDiscoverLimit ?? 15}
          required
        />
      </Field>
      <label style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={initial?.isActive ?? true}
        />
        Campaign is active
      </label>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save campaign"}
      </Button>
    </form>
  );
}
