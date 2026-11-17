"use client";

import Link from "next/link";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Card>
      <h2>Something went wrong</h2>
      <p style={{ color: "var(--muted)", margin: "8px 0 16px" }}>
        {error.message || "Please try again."}
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Button onClick={reset}>Retry</Button>
        <Link href="/api/auth/logout">
          <Button type="button" variant="ghost">
            Sign out
          </Button>
        </Link>
      </div>
    </Card>
  );
}
