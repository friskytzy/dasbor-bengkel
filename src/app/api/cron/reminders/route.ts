import { NextRequest, NextResponse } from "next/server";
import { processDueReminders } from "@/lib/reminders";
import { expireDuePoints } from "@/lib/loyalty";

export const runtime = "nodejs";

function authorize(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const header = req.headers.get("authorization") ?? "";
  return header === `Bearer ${expected}`;
}

export async function POST(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const [reminders, expiry] = await Promise.all([
    processDueReminders(),
    expireDuePoints(),
  ]);
  return NextResponse.json({ reminders, expiry });
}

export async function GET(req: NextRequest) {
  // Vercel-style scheduled invocations send GET — accept both.
  return POST(req);
}
