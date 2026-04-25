import { prisma } from "@/lib/prisma";
import {
  awardPoints,
  calculateEarnedPoints,
  calculateRedeemDiscount,
  redeemPoints,
} from "@/lib/loyalty";
import { makeCode } from "@/lib/utils";

export type FinalizeTransactionInput = {
  bookingId: string;
  paymentMethod?: string;
  redeemPoints?: number;
  extraItems?: { description: string; unitPrice: number; quantity: number }[];
};

export async function finalizeTransaction(input: FinalizeTransactionInput) {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: input.bookingId },
      include: { services: { include: { service: true } } },
    });
    if (!booking) throw new Error("Booking tidak ditemukan");
    if (booking.status === "DONE") throw new Error("Booking sudah selesai");

    const items: {
      description: string;
      unitPrice: number;
      quantity: number;
      lineTotal: number;
      serviceId?: string;
    }[] = booking.services.map((bs) => ({
      description: bs.service.name,
      unitPrice: bs.priceSnapshot,
      quantity: bs.quantity,
      lineTotal: bs.priceSnapshot * bs.quantity,
      serviceId: bs.serviceId,
    }));

    for (const e of input.extraItems ?? []) {
      items.push({
        description: e.description,
        unitPrice: e.unitPrice,
        quantity: e.quantity,
        lineTotal: e.unitPrice * e.quantity,
      });
    }

    const subtotal = items.reduce((acc, it) => acc + it.lineTotal, 0);
    const { validPoints: redeemedPoints, discount: discountAmount } =
      calculateRedeemDiscount(input.redeemPoints ?? 0);
    const total = Math.max(0, subtotal - discountAmount);
    const earnedPoints = calculateEarnedPoints(total);

    const todayCount = await tx.transaction.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lt: new Date(new Date().setHours(23, 59, 59, 999)),
        },
      },
    });
    const invoiceNumber = makeCode("INV", todayCount + 1);

    const transaction = await tx.transaction.create({
      data: {
        invoiceNumber,
        bookingId: booking.id,
        customerId: booking.customerId,
        branchId: booking.branchId,
        status: "PAID",
        subtotal,
        discountAmount,
        redeemedPoints,
        total,
        earnedPoints,
        paymentMethod: input.paymentMethod,
        paidAt: new Date(),
        items: { create: items },
      },
    });

    if (redeemedPoints > 0) {
      await redeemPoints(tx, {
        userId: booking.customerId,
        transactionId: transaction.id,
        points: redeemedPoints,
      });
    }
    if (earnedPoints > 0) {
      await awardPoints(tx, {
        userId: booking.customerId,
        transactionId: transaction.id,
        points: earnedPoints,
        note: `Earn dari ${invoiceNumber}`,
      });
    }

    await tx.booking.update({
      where: { id: booking.id },
      data: { status: "DONE", doneAt: new Date() },
    });

    // Schedule H+50 reminder
    const remindAt = new Date();
    remindAt.setDate(remindAt.getDate() + 50);
    await tx.serviceReminder.create({
      data: {
        userId: booking.customerId,
        bookingId: booking.id,
        scheduledFor: remindAt,
        status: "SCHEDULED",
        message: `Reminder servis berkala 50 hari setelah ${invoiceNumber}`,
      },
    });

    return transaction;
  });
}
