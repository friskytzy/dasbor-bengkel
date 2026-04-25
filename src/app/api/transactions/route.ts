import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { finalizeTransaction } from "@/lib/transactions";

export const runtime = "nodejs";

const finalizeSchema = z.object({
  bookingId: z.string().min(1),
  paymentMethod: z.string().optional(),
  redeemPoints: z.number().int().min(0).optional(),
  extraItems: z
    .array(
      z.object({
        description: z.string().min(1),
        unitPrice: z.number().int().min(0),
        quantity: z.number().int().min(1),
      }),
    )
    .optional(),
});

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  const json = await req.json().catch(() => null);
  const parsed = finalizeSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Payload invalid", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  try {
    const transaction = await finalizeTransaction(parsed.data);
    return NextResponse.json({ transaction }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ message: (err as Error).message }, { status: 400 });
  }
}
