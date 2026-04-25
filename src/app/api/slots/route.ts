import { NextRequest, NextResponse } from "next/server";
import { ensureMechanicSlots, isBranchDailyCapacityAvailable } from "@/lib/slots";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const branchId = url.searchParams.get("branchId");
  const date = url.searchParams.get("date");
  if (!branchId || !date) {
    return NextResponse.json({ message: "branchId & date wajib" }, { status: 400 });
  }
  const target = new Date(`${date}T00:00:00`);
  if (Number.isNaN(target.getTime())) {
    return NextResponse.json({ message: "tanggal invalid" }, { status: 400 });
  }
  const [slots, cap] = await Promise.all([
    ensureMechanicSlots(branchId, target),
    isBranchDailyCapacityAvailable(branchId, target),
  ]);
  return NextResponse.json({
    capacity: cap,
    slots: slots.map((s) => ({
      id: s.id,
      startTime: s.startTime.toISOString(),
      endTime: s.endTime.toISOString(),
      capacity: s.capacity,
      booked: s.booked,
      remaining: Math.max(0, s.capacity - s.booked),
      available: !s.isLocked && s.booked < s.capacity && cap.available,
    })),
  });
}
