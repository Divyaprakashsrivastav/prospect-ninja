import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isPrismaUnavailable, prisma } from "@/lib/db";

function sessionUserId(
  session: { user?: { id?: string | null } } | null,
): string | null {
  const id = session?.user?.id;
  if (typeof id !== "string" || id.trim().length === 0) {
    return null;
  }
  return id;
}

export async function requireUser() {
  const session = await auth();
  const id = sessionUserId(session);
  if (!id) {
    redirect("/login");
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true },
    });
    if (!user) {
      // JWT still present but account was removed — clear the session.
      redirect("/api/auth/logout");
    }
    return user;
  } catch (error) {
    if (isPrismaUnavailable(error)) {
      return {
        id,
        email: session?.user?.email ?? "",
        name: session?.user?.name ?? "",
      };
    }
    throw error;
  }
}

export async function getApiUser() {
  const session = await auth();
  const id = sessionUserId(session);
  if (!id) {
    return null;
  }
  try {
    return await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true },
    });
  } catch (error) {
    if (isPrismaUnavailable(error)) {
      return {
        id,
        email: session?.user?.email ?? "",
        name: session?.user?.name ?? "",
      };
    }
    throw error;
  }
}
