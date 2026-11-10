import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ensureDefaultConnection } from "@/modules/integrations/service";

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(72),
});

export async function registerUser(input: unknown) {
  const data = registerSchema.parse(input);
  const existing = await prisma.user.findUnique({
    where: { email: data.email },
  });
  if (existing) {
    throw new Error("An account with this email already exists.");
  }
  const passwordHash = await bcrypt.hash(data.password, 12);
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash,
    },
  });
  await ensureDefaultConnection(user.id);
  return { id: user.id, email: user.email, name: user.name };
}
