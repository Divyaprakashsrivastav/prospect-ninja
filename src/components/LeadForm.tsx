"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Banner } from "@/components/Banner";
import { Button } from "@/components/Button";
import { Field, Select, TextArea, TextInput } from "@/components/Field";
import styles from "./LeadForm.module.css";
import { COMPANY_SIZES } from "@/modules/campaigns/schema";
import {
  LEAD_SOURCES,
  LEAD_STATUS_LABELS,
  LEAD_STATUSES,
  type LeadStatus,
} from "@/modules/leads/schema";

type LeadFormValues = {
  firstName: string;
  lastName: string;
  jobTitle: string;
  company: string;
  email: string;
  phone: string;
  linkedinUrl: string;
  website: string;
  industry: string;
  location: string;
  companySize: string;
  source: string;
  status: LeadStatus;
  notes: string;
};

export function LeadForm({
  leadId,
  initial,
}: {
  leadId?: string;
  initial?: Partial<LeadFormValues>;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const payload = {
      firstName: String(formData.get("firstName") ?? ""),
      lastName: String(formData.get("lastName") ?? ""),
      jobTitle: String(formData.get("jobTitle") ?? ""),
      company: String(formData.get("company") ?? ""),
      email: String(formData.get("email") ?? "").trim() || undefined,
      phone: String(formData.get("phone") ?? "").trim() || undefined,
      linkedinUrl: String(formData.get("linkedinUrl") ?? "").trim() || undefined,
      website: String(formData.get("website") ?? "").trim() || undefined,
      industry: String(formData.get("industry") ?? ""),
      location: String(formData.get("location") ?? ""),
      companySize: String(formData.get("companySize") ?? ""),
      source: String(formData.get("source") ?? "manual"),
      status: String(formData.get("status") ?? "new"),
      notes: String(formData.get("notes") ?? ""),
    };
    const response = await fetch(
      leadId ? `/api/v1/leads/${leadId}` : "/api/v1/leads",
      {
        method: leadId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const data = (await response.json()) as {
      error?: string;
      lead?: { id: string };
    };
    setPending(false);
    if (!response.ok) {
      setError(data.error ?? "Could not save lead.");
      return;
    }
    router.push(
      leadId
        ? `/leads/${leadId}?updated=1`
        : `/leads/${data.lead?.id}?created=1`,
    );
    router.refresh();
  }

  return (
    <form action={onSubmit}>
      {error ? <Banner tone="error">{error}</Banner> : null}
      <div className={styles.grid}>
        <Field label="First name">
          <TextInput
            name="firstName"
            required
            defaultValue={initial?.firstName}
          />
        </Field>
        <Field label="Last name">
          <TextInput name="lastName" required defaultValue={initial?.lastName} />
        </Field>
        <Field label="Job title">
          <TextInput name="jobTitle" defaultValue={initial?.jobTitle} />
        </Field>
        <Field label="Company">
          <TextInput name="company" defaultValue={initial?.company} />
        </Field>
        <Field label="Email">
          <TextInput
            name="email"
            type="email"
            defaultValue={initial?.email}
            placeholder="name@company.com"
          />
        </Field>
        <Field label="Phone">
          <TextInput name="phone" defaultValue={initial?.phone} />
        </Field>
        <div className={styles.wide}>
          <Field label="LinkedIn URL" hint="Include https://">
            <TextInput
              name="linkedinUrl"
              defaultValue={initial?.linkedinUrl}
              placeholder="https://www.linkedin.com/in/…"
            />
          </Field>
        </div>
        <div className={styles.wide}>
          <Field label="Website" hint="Include https://">
            <TextInput
              name="website"
              defaultValue={initial?.website}
              placeholder="https://"
            />
          </Field>
        </div>
        <Field label="Industry">
          <TextInput name="industry" defaultValue={initial?.industry} />
        </Field>
        <Field label="Location">
          <TextInput name="location" defaultValue={initial?.location} />
        </Field>
        <Field label="Company size">
          <Select name="companySize" defaultValue={initial?.companySize ?? ""}>
            <option value="">Not set</option>
            {COMPANY_SIZES.map((size) => (
              <option key={size.id} value={size.id}>
                {size.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Lead source">
          <Select name="source" defaultValue={initial?.source ?? "manual"}>
            {LEAD_SOURCES.map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Status">
          <Select name="status" defaultValue={initial?.status ?? "new"}>
            {LEAD_STATUSES.map((status) => (
              <option key={status} value={status}>
                {LEAD_STATUS_LABELS[status]}
              </option>
            ))}
          </Select>
        </Field>
        <div className={styles.wide}>
          <Field label="Notes">
            <TextArea name="notes" rows={4} defaultValue={initial?.notes} />
          </Field>
        </div>
      </div>
      <div className={styles.actions}>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : leadId ? "Save changes" : "Create lead"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push(leadId ? `/leads/${leadId}` : "/leads")}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
