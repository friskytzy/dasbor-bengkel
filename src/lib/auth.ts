import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import type { User } from "@prisma/client";

/**
 * Sinkronisasi user Clerk -> tabel `users` lokal.
 * Dipanggil di server actions / API routes yang butuh `User` row dari DB.
 */
export async function getOrCreateAppUser(): Promise<User | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const existing = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (existing) return existing;

  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const adminIds = (process.env.ADMIN_USER_IDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const role = adminIds.includes(userId) ? "ADMIN" : "CUSTOMER";

  return prisma.user.create({
    data: {
      clerkId: userId,
      email: clerkUser.emailAddresses[0]?.emailAddress,
      phone: clerkUser.phoneNumbers[0]?.phoneNumber,
      fullName:
        [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
        clerkUser.username ||
        "Pengguna",
      role,
    },
  });
}

export async function requireUser(): Promise<User> {
  const user = await getOrCreateAppUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
    throw new Error("FORBIDDEN");
  }
  return user;
}
