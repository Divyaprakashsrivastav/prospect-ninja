import { Card } from "@/components/Card";

export default function OutreachLoading() {
  return (
    <Card>
      <p style={{ color: "var(--muted)" }} aria-busy="true">
        Loading outreach workspace…
      </p>
    </Card>
  );
}
