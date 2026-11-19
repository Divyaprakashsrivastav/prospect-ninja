import { Card } from "@/components/Card";

export default function Loading() {
  return (
    <Card>
      <p style={{ color: "var(--muted)" }} aria-busy="true">
        Loading…
      </p>
    </Card>
  );
}
