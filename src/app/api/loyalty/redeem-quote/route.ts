import { NextRequest, NextResponse } from "next/server";
import { calculateRedeemDiscount, LOYALTY_RULES } from "@/lib/loyalty";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const points = Number(new URL(req.url).searchParams.get("points") ?? 0);
  return NextResponse.json({
    rules: LOYALTY_RULES,
    quote: calculateRedeemDiscount(points),
  });
}
