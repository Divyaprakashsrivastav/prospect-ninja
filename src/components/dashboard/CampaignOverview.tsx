"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { IconArrowRight, IconSearch } from "@/components/icons";
import { formatDateShort } from "@/lib/dates";
import type { CampaignPerformance } from "@/modules/analytics/service";
import styles from "./CampaignOverview.module.css";

type SortKey = "updatedAt" | "name" | "prospectCount" | "messageCount";

export function CampaignOverview({
  campaigns,
  loadError,
}: {
  campaigns: CampaignPerformance[];
  loadError?: string | null;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "paused">("all");
  const [sortKey, setSortKey] = useState<SortKey>("updatedAt");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = campaigns.filter((campaign) => {
      if (status === "active" && !campaign.isActive) return false;
      if (status === "paused" && campaign.isActive) return false;
      if (!q) return true;
      return (
        campaign.name.toLowerCase().includes(q) ||
        campaign.industry.toLowerCase().includes(q) ||
        campaign.location.toLowerCase().includes(q)
      );
    });

    return rows.sort((a, b) => {
      if (sortKey === "name") {
        return a.name.localeCompare(b.name);
      }
      if (sortKey === "prospectCount" || sortKey === "messageCount") {
        return b[sortKey] - a[sortKey];
      }
      return (
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    });
  }, [campaigns, query, sortKey, status]);

  if (loadError) {
    return (
      <section className={styles.panel}>
        <EmptyState
          title="Campaigns unavailable"
          description="Retry once the database connection is healthy. Nothing was deleted."
        />
      </section>
    );
  }

  if (campaigns.length === 0) {
    return (
      <section className={styles.panel}>
        <EmptyState
          title="No campaigns yet"
          description="Create an Ideal Customer Profile to start daily discovery (max 15 new prospects per campaign per day)."
          action={
            <Link href="/targeting/new">
              <Button>Create campaign</Button>
            </Link>
          }
        />
      </section>
    );
  }

  return (
    <section className={styles.panel}>
      <div className={styles.head}>
        <div>
          <h2>Campaign overview</h2>
          <p>Search and filter your live campaigns</p>
        </div>
        <Link href="/targeting" className={styles.manage}>
          Manage all <IconArrowRight size={14} />
        </Link>
      </div>

      <div className={styles.toolbar}>
        <label className={styles.search}>
          <IconSearch size={15} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, industry, location"
            aria-label="Search campaigns"
          />
        </label>
        <select
          value={status}
          onChange={(event) =>
            setStatus(event.target.value as "all" | "active" | "paused")
          }
          aria-label="Filter by status"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
        </select>
        <select
          value={sortKey}
          onChange={(event) => setSortKey(event.target.value as SortKey)}
          aria-label="Sort campaigns"
        >
          <option value="updatedAt">Last updated</option>
          <option value="name">Name</option>
          <option value="prospectCount">Prospects</option>
          <option value="messageCount">Messages</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No matching campaigns"
          description="Try a different search or clear filters."
        />
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Industry</th>
                <th>Location</th>
                <th>Prospects</th>
                <th>Messages</th>
                <th>Pending</th>
                <th>Updated</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((campaign) => (
                <tr key={campaign.id}>
                  <td>
                    <div className={styles.nameCell}>
                      <Link href={`/targeting/${campaign.id}`}>
                        <strong>{campaign.name}</strong>
                      </Link>
                      <Badge status={campaign.isActive ? "active" : "paused"} />
                    </div>
                  </td>
                  <td>{campaign.industry}</td>
                  <td>{campaign.location}</td>
                  <td>{campaign.prospectCount}</td>
                  <td>{campaign.messageCount}</td>
                  <td>{campaign.pendingApprovals}</td>
                  <td>{formatDateShort(campaign.updatedAt)}</td>
                  <td>
                    <Link
                      href={`/targeting/${campaign.id}`}
                      className={styles.view}
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
