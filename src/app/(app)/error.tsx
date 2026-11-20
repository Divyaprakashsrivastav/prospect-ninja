"use client";

import Link from "next/link";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import {
  DATABASE_UNREACHABLE_MESSAGE,
  isPrismaUnavailable,
} from "@/lib/db-errors";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const unreachable = isPrismaUnavailable(error);
  return (
    <Card>
      <h2>Something went wrong</h2>
      <p style={{ color: "var(--muted)", margin: "8px 0 16px" }}>
        {unreachable
          ? DATABASE_UNREACHABLE_MESSAGE
          : "Please try again. If this continues, sign out and sign back in."}
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
