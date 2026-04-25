/**
 * Generator slot mekanik:
 *   - Interval tepat 45 menit
 *   - Jam operasional 09:00 – 18:00
 *   - Jeda istirahat siang 12:00 – 13:00 (dipotong, tidak ada slot di rentang itu)
 *   - Hard-cap booking harian 11 motor per cabang
 */

import { prisma } from "@/lib/prisma";

export const SLOT_RULES = {
  OPEN_HOUR: 9,
  CLOSE_HOUR: 18,
  LUNCH_START_HOUR: 12,
  LUNCH_END_HOUR: 13,
  INTERVAL_MINUTES: 45,
  DAILY_BOOKING_CAP: 11,
} as const;

export type SlotWindow = { start: Date; end: Date };

/** Hitung daftar window 45-mnt untuk tanggal tertentu (timezone Asia/Jakarta diwakili oleh tanggal lokal). */
export function generateSlotWindows(date: Date): SlotWindow[] {
  const windows: SlotWindow[] = [];
  const base = new Date(date);
  base.setHours(SLOT_RULES.OPEN_HOUR, 0, 0, 0);

  const closing = new Date(date);
  closing.setHours(SLOT_RULES.CLOSE_HOUR, 0, 0, 0);

  const lunchStart = new Date(date);
  lunchStart.setHours(SLOT_RULES.LUNCH_START_HOUR, 0, 0, 0);
  const lunchEnd = new Date(date);
  lunchEnd.setHours(SLOT_RULES.LUNCH_END_HOUR, 0, 0, 0);

  let cursor = new Date(base);
  while (cursor.getTime() + SLOT_RULES.INTERVAL_MINUTES * 60_000 <= closing.getTime()) {
    const slotEnd = new Date(cursor.getTime() + SLOT_RULES.INTERVAL_MINUTES * 60_000);

    // Skip slot yang beririsan dengan jam istirahat 12:00 – 13:00.
    const overlapsLunch =
      cursor < lunchEnd && slotEnd > lunchStart;
    if (!overlapsLunch) {
      windows.push({ start: new Date(cursor), end: slotEnd });
    }
    cursor = slotEnd;
    // Jika cursor masuk lunch, lompat ke lunchEnd.
    if (cursor < lunchEnd && cursor >= lunchStart) {
      cursor = new Date(lunchEnd);
    }
  }

  return windows;
}

/** Pastikan slot harian untuk sebuah cabang sudah ter-materialize di DB. */
export async function ensureMechanicSlots(branchId: string, date: Date) {
  const branch = await prisma.branch.findUnique({ where: { id: branchId } });
  if (!branch) throw new Error("Cabang tidak ditemukan");

  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);

  const existing = await prisma.mechanicSlot.findMany({
    where: { branchId, slotDate: dayStart },
    orderBy: { startTime: "asc" },
  });
  if (existing.length > 0) return existing;

  const windows = generateSlotWindows(dayStart);
  if (windows.length === 0) return [];

  await prisma.mechanicSlot.createMany({
    data: windows.map((w) => ({
      branchId,
      slotDate: dayStart,
      startTime: w.start,
      endTime: w.end,
      capacity: branch.mechanic_capacity,
      booked: 0,
    })),
    skipDuplicates: true,
  });

  return prisma.mechanicSlot.findMany({
    where: { branchId, slotDate: dayStart },
    orderBy: { startTime: "asc" },
  });
}

/** Cek apakah cabang masih bisa menerima booking baru pada tanggal tsb. */
export async function isBranchDailyCapacityAvailable(branchId: string, date: Date) {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const count = await prisma.booking.count({
    where: {
      branchId,
      scheduledAt: { gte: dayStart, lt: dayEnd },
      status: { notIn: ["CANCELLED", "NO_SHOW"] },
    },
  });
  return {
    used: count,
    cap: SLOT_RULES.DAILY_BOOKING_CAP,
    available: count < SLOT_RULES.DAILY_BOOKING_CAP,
  };
}
