import { prisma } from "@/lib/prisma";
import {
  buildServiceReminderMessage,
  normalizePhone,
  sendWhatsApp,
} from "@/lib/fonnte";

/**
 * Proses semua reminder yang sudah jatuh tempo.
 * Dipanggil oleh cron (GitHub Actions / Railway scheduler / Vercel Cron).
 */
export async function processDueReminders(now: Date = new Date()) {
  const due = await prisma.serviceReminder.findMany({
    where: { status: "SCHEDULED", scheduledFor: { lte: now } },
    include: {
      user: true,
      booking: {
        include: { branch: true, motorcycle: true },
      },
    },
    take: 100,
    orderBy: { scheduledFor: "asc" },
  });

  let sent = 0;
  let failed = 0;

  for (const reminder of due) {
    if (!reminder.user.phone) {
      await prisma.serviceReminder.update({
        where: { id: reminder.id },
        data: {
          status: "CANCELLED",
          errorMessage: "User tidak punya nomor HP",
        },
      });
      continue;
    }

    const motorcycle = reminder.booking?.motorcycle;
    const branch = reminder.booking?.branch;
    const message = buildServiceReminderMessage({
      customerName: reminder.user.fullName,
      motorcycle: motorcycle
        ? `${motorcycle.brand} ${motorcycle.model} (${motorcycle.plateNumber})`
        : "motor Anda",
      branchName: branch?.name ?? "Dasbor Bengkel Batam",
      daysSinceService: 50,
      bookingUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/booking`,
    });

    const result = await sendWhatsApp({
      target: normalizePhone(reminder.user.phone),
      message,
    });

    if (result.ok) {
      sent += 1;
      await prisma.serviceReminder.update({
        where: { id: reminder.id },
        data: {
          status: "SENT",
          sentAt: new Date(),
          fonnteMessageId: result.id,
          attempts: { increment: 1 },
        },
      });
    } else {
      failed += 1;
      await prisma.serviceReminder.update({
        where: { id: reminder.id },
        data: {
          status: reminder.attempts >= 2 ? "FAILED" : "SCHEDULED",
          attempts: { increment: 1 },
          errorMessage: result.reason,
        },
      });
    }
  }

  return { processed: due.length, sent, failed };
}
