import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { withDatabaseFallback } from "@/lib/db";

async function loadExistingUser() {
  const session = await auth();
  const id = session?.user?.id;
  if (!id || typeof id !== "string") {
    return { session, user: null as null };
  }
  const user = await withDatabaseFallback((client) =>
    client.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true },
    }),
  );
  return { session, user };
}

export async function requireUser() {
  const { session, user } = await loadExistingUser();
  if (session?.user && !user) {
    redirect("/api/auth/stale-session");
  }
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function getApiUser() {
  const { user } = await loadExistingUser();
  return user;
}
