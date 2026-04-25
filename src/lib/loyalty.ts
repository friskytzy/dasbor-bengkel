/**
 * Aturan loyalty Dasbor Bengkel:
 *   - 10 poin per kelipatan transaksi Rp 10.000 (subtotal sebelum diskon poin).
 *   - Penukaran minimum 100 poin = diskon Rp 10.000 (kelipatan 100).
 *   - Masa berlaku poin EARN: 12 bulan sejak diterbitkan (FIFO saat REDEEM/EXPIRE).
 */

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import {
  LOYALTY_RULES,
  calculateEarnedPoints,
  calculateRedeemDiscount,
} from "@/lib/loyalty-rules";
export { LOYALTY_RULES, calculateEarnedPoints, calculateRedeemDiscount };

export function pointsExpiryDate(from: Date = new Date()): Date {
  const d = new Date(from);
  d.setMonth(d.getMonth() + LOYALTY_RULES.EXPIRY_MONTHS);
  return d;
}

/** Tambah poin EARN (FIFO-ready) + update saldo. Harus dipanggil dalam transaksi DB. */
export async function awardPoints(
  tx: Prisma.TransactionClient,
  args: {
    userId: string;
    transactionId: string;
    points: number;
    note?: string;
  },
) {
  if (args.points <= 0) return;
  const expiresAt = pointsExpiryDate();
  await tx.loyaltyLedger.create({
    data: {
      userId: args.userId,
      transactionId: args.transactionId,
      type: "EARN",
      points: args.points,
      remaining: args.points,
      expiresAt,
      note: args.note ?? "Poin dari transaksi",
    },
  });
  await tx.loyaltyPoint.upsert({
    where: { userId: args.userId },
    create: {
      userId: args.userId,
      balance: args.points,
      lifetimeEarned: args.points,
    },
    update: {
      balance: { increment: args.points },
      lifetimeEarned: { increment: args.points },
    },
  });
}

/** Tukar poin REDEEM (FIFO terhadap EARN buckets). Harus dipanggil dalam transaksi DB. */
export async function redeemPoints(
  tx: Prisma.TransactionClient,
  args: {
    userId: string;
    transactionId: string;
    points: number;
  },
) {
  const { validPoints } = calculateRedeemDiscount(args.points);
  if (validPoints <= 0) return 0;

  const balanceRow = await tx.loyaltyPoint.findUnique({
    where: { userId: args.userId },
  });
  if (!balanceRow || balanceRow.balance < validPoints) {
    throw new Error("Saldo poin tidak mencukupi untuk penukaran");
  }

  // FIFO consume EARN buckets that haven't expired.
  let remainingToConsume = validPoints;
  const buckets = await tx.loyaltyLedger.findMany({
    where: {
      userId: args.userId,
      type: "EARN",
      remaining: { gt: 0 },
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: { createdAt: "asc" },
  });

  for (const bucket of buckets) {
    if (remainingToConsume <= 0) break;
    const take = Math.min(bucket.remaining, remainingToConsume);
    await tx.loyaltyLedger.update({
      where: { id: bucket.id },
      data: { remaining: bucket.remaining - take },
    });
    remainingToConsume -= take;
  }

  await tx.loyaltyLedger.create({
    data: {
      userId: args.userId,
      transactionId: args.transactionId,
      type: "REDEEM",
      points: -validPoints,
      remaining: 0,
      note: `Tukar ${validPoints} poin`,
    },
  });

  await tx.loyaltyPoint.update({
    where: { userId: args.userId },
    data: {
      balance: { decrement: validPoints },
      lifetimeRedeemed: { increment: validPoints },
    },
  });

  return validPoints;
}

/**
 * Expire poin EARN yang `expiresAt`-nya sudah lewat dan masih ada `remaining`.
 * Di-invoke dari cron harian.
 */
export async function expireDuePoints(now: Date = new Date()) {
  const due = await prisma.loyaltyLedger.findMany({
    where: {
      type: "EARN",
      remaining: { gt: 0 },
      expiresAt: { lte: now },
    },
  });
  let expiredTotal = 0;
  for (const bucket of due) {
    if (bucket.remaining <= 0) continue;
    await prisma.$transaction(async (tx) => {
      await tx.loyaltyLedger.update({
        where: { id: bucket.id },
        data: { remaining: 0 },
      });
      await tx.loyaltyLedger.create({
        data: {
          userId: bucket.userId,
          type: "EXPIRE",
          points: -bucket.remaining,
          remaining: 0,
          note: `Poin expired (12 bulan)`,
        },
      });
      await tx.loyaltyPoint.update({
        where: { userId: bucket.userId },
        data: { balance: { decrement: bucket.remaining } },
      });
    });
    expiredTotal += bucket.remaining;
  }
  return { processed: due.length, expiredTotal };
}
