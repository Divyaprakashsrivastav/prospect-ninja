import { Card } from "@/components/Card";

export default function LeadsLoading() {
  return (
    <Card>
      <p style={{ color: "var(--muted)" }} aria-busy="true">
        Loading leads…
      </p>
    </Card>
  );
}
