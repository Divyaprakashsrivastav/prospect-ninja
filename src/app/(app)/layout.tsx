import { AppNav } from "@/components/AppNav";
import { requireUser } from "@/lib/session";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  return <AppNav userLabel={user.email}>{children}</AppNav>;
}
