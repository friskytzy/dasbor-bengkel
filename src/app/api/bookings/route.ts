import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { BookingError, createBooking } from "@/lib/bookings";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

const createSchema = z.object({
  branchId: z.string().min(1),
  slotId: z.string().min(1),
  serviceIds: z.array(z.string().min(1)).min(1),
  motorcycleId: z.string().min(1).optional(),
  newMotorcycle: z
    .object({
      plateNumber: z.string().min(1),
      brand: z.string().min(1),
      model: z.string().min(1),
      year: z.number().int().optional(),
    })
    .optional(),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Payload invalid", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const slot = await prisma.mechanicSlot.findUnique({ where: { id: data.slotId } });
  if (!slot || slot.branchId !== data.branchId) {
    return NextResponse.json({ message: "Slot tidak valid" }, { status: 400 });
  }

  let motorcycleId = data.motorcycleId;
  if (!motorcycleId) {
    if (!data.newMotorcycle) {
      return NextResponse.json(
        { message: "motorcycleId atau newMotorcycle wajib" },
        { status: 400 },
      );
    }
    const moto = await prisma.motorcycle.upsert({
      where: { plateNumber: data.newMotorcycle.plateNumber },
      create: { ...data.newMotorcycle, ownerId: user.id },
      update: { ownerId: user.id },
    });
    motorcycleId = moto.id;
  }

  try {
    const booking = await createBooking({
      customerId: user.id,
      motorcycleId,
      branchId: data.branchId,
      scheduledAt: slot.startTime,
      serviceIds: data.serviceIds,
      notes: data.notes,
    });
    await logAudit({
      actorId: user.id,
      action: "BOOKING_CREATED",
      entity: "Booking",
      entityId: booking.id,
      metadata: {
        code: booking.code,
        branchId: booking.branchId,
        scheduledAt: booking.scheduledAt.toISOString(),
        serviceIds: data.serviceIds,
      },
    });
    return NextResponse.json({ booking }, { status: 201 });
  } catch (err) {
    if (err instanceof BookingError) {
      return NextResponse.json(
        { message: err.message, code: err.code },
        { status: err.status },
      );
    }
    return NextResponse.json(
      { message: (err as Error).message },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const limit = Math.min(50, Number(url.searchParams.get("limit") ?? 20));
  const bookings = await prisma.booking.findMany({
    where: { customerId: user.id },
    orderBy: { scheduledAt: "desc" },
    take: limit,
    include: { branch: true, motorcycle: true, services: { include: { service: true } }, transaction: true },
  });
  return NextResponse.json({ bookings });
}
