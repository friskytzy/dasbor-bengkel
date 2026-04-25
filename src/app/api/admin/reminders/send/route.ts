import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  buildServiceReminderMessage,
  normalizePhone,
  sendWhatsApp,
} from "@/lib/fonnte";

export const runtime = "nodejs";

const schema = z.object({
  bookingId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  const json = await req.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ message: "Payload invalid" }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({
    where: { id: parsed.data.bookingId },
    include: { customer: true, motorcycle: true, branch: true },
  });
  if (!booking) return NextResponse.json({ message: "Tidak ditemukan" }, { status: 404 });
  if (!booking.customer.phone) {
    return NextResponse.json({ message: "Customer tidak punya nomor HP" }, { status: 400 });
  }

  const days = booking.doneAt
    ? Math.floor((Date.now() - booking.doneAt.getTime()) / (1000 * 60 * 60 * 24))
    : 50;

  const message = buildServiceReminderMessage({
    customerName: booking.customer.fullName,
    motorcycle: `${booking.motorcycle.brand} ${booking.motorcycle.model} (${booking.motorcycle.plateNumber})`,
    branchName: booking.branch.name,
    daysSinceService: days,
    bookingUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/booking`,
  });

  const result = await sendWhatsApp({
    target: normalizePhone(booking.customer.phone),
    message,
  });

  await prisma.serviceReminder.upsert({
    where: { bookingId: booking.id },
    update: {
      status: result.ok ? "SENT" : "FAILED",
      sentAt: result.ok ? new Date() : undefined,
      fonnteMessageId: result.id,
      errorMessage: result.ok ? null : result.reason,
      attempts: { increment: 1 },
    },
    create: {
      userId: booking.customerId,
      bookingId: booking.id,
      scheduledFor: new Date(),
      status: result.ok ? "SENT" : "FAILED",
      sentAt: result.ok ? new Date() : undefined,
      fonnteMessageId: result.id,
      errorMessage: result.ok ? null : result.reason,
      message,
      attempts: 1,
    },
  });

  return NextResponse.json({ ok: result.ok, reason: result.reason });
}
