import { prisma } from "@/lib/prisma";
import {
  ensureMechanicSlots,
  isBranchDailyCapacityAvailable,
  SLOT_RULES,
} from "@/lib/slots";
import { makeCode } from "@/lib/utils";

export type CreateBookingInput = {
  customerId: string;
  motorcycleId: string;
  branchId: string;
  scheduledAt: Date;
  serviceIds: string[];
  notes?: string;
};

export class BookingError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export async function createBooking(input: CreateBookingInput) {
  if (input.serviceIds.length === 0) {
    throw new BookingError("NO_SERVICES", "Pilih minimal 1 layanan");
  }

  const cap = await isBranchDailyCapacityAvailable(input.branchId, input.scheduledAt);
  if (!cap.available) {
    throw new BookingError(
      "DAILY_CAP_REACHED",
      `Kapasitas harian cabang sudah penuh (${SLOT_RULES.DAILY_BOOKING_CAP} motor). Silakan pilih tanggal lain.`,
      409,
    );
  }

  await ensureMechanicSlots(input.branchId, input.scheduledAt);

  const slot = await prisma.mechanicSlot.findFirst({
    where: {
      branchId: input.branchId,
      startTime: input.scheduledAt,
    },
  });
  if (!slot) {
    throw new BookingError(
      "INVALID_SLOT",
      "Slot waktu tidak valid untuk cabang ini",
    );
  }
  if (slot.isLocked) {
    throw new BookingError("SLOT_LOCKED", "Slot ini sedang dikunci");
  }
  if (slot.booked >= slot.capacity) {
    throw new BookingError(
      "SLOT_FULL",
      "Slot waktu ini sudah penuh, pilih waktu lain",
      409,
    );
  }

  const services = await prisma.service.findMany({
    where: { id: { in: input.serviceIds }, isActive: true },
  });
  if (services.length !== input.serviceIds.length) {
    throw new BookingError("INVALID_SERVICES", "Layanan tidak valid");
  }

  const estimatedTotal = services.reduce((acc, s) => acc + s.price, 0);

  const todayCount = await prisma.booking.count({
    where: {
      branchId: input.branchId,
      scheduledAt: {
        gte: new Date(new Date(input.scheduledAt).setHours(0, 0, 0, 0)),
        lt: new Date(new Date(input.scheduledAt).setHours(23, 59, 59, 999)),
      },
    },
  });

  const code = makeCode("BK", todayCount + 1, input.scheduledAt);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.mechanicSlot.update({
      where: { id: slot.id },
      data: { booked: { increment: 1 } },
    });
    if (updated.booked > updated.capacity) {
      throw new BookingError("SLOT_FULL", "Slot baru saja terisi penuh", 409);
    }
    const booking = await tx.booking.create({
      data: {
        code,
        customerId: input.customerId,
        motorcycleId: input.motorcycleId,
        branchId: input.branchId,
        slotId: slot.id,
        scheduledAt: input.scheduledAt,
        notes: input.notes,
        estimatedTotal,
        services: {
          create: services.map((s) => ({
            serviceId: s.id,
            priceSnapshot: s.price,
          })),
        },
      },
      include: { services: { include: { service: true } } },
    });
    return booking;
  });
}

export async function cancelBooking(bookingId: string, reason?: string) {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: { slot: true },
    });
    if (!booking) throw new BookingError("NOT_FOUND", "Booking tidak ditemukan", 404);
    if (booking.status === "CANCELLED" || booking.status === "DONE") {
      throw new BookingError(
        "INVALID_STATE",
        `Booking sudah ${booking.status.toLowerCase()}`,
      );
    }
    await tx.mechanicSlot.update({
      where: { id: booking.slotId },
      data: { booked: { decrement: 1 } },
    });
    return tx.booking.update({
      where: { id: bookingId },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        notes: reason ? `${booking.notes ?? ""}\n[CANCEL] ${reason}` : booking.notes,
      },
    });
  });
}
