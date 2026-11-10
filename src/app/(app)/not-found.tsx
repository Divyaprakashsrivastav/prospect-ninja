import { Card } from "@/components/Card";

export default function NotFound() {
  return (
    <Card>
      <h2>Not found</h2>
      <p style={{ color: "var(--muted)", marginTop: 8 }}>
        This page or record does not exist.
      </p>
    </Card>
  );
}
