import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isPrismaUnavailable, prisma } from "@/lib/db";

export async function requireUser() {
  const session = await auth();
  const id = session?.user?.id;
  if (!id || typeof id !== "string") {
    redirect("/login");
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true },
    });
    if (!user) {
      redirect("/api/auth/logout");
    }
    return user;
  } catch (error) {
    if (isPrismaUnavailable(error)) {
      return {
        id,
        email: session.user.email ?? "",
        name: session.user.name ?? "",
      };
    }
    throw error;
  }
}

export async function getApiUser() {
  const session = await auth();
  const id = session?.user?.id;
  if (!id || typeof id !== "string") {
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
        email: session.user.email ?? "",
        name: session.user.name ?? "",
      };
    }
    throw error;
  }
}
