import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * Webhook delivery report dari Fonnte. Payload-nya bervariasi; di sini
 * kita hanya log + tandai reminder sebagai SENT/FAILED bila messageId match.
 */
export async function POST(req: NextRequest) {
  const json = (await req.json().catch(() => null)) as
    | { id?: string; status?: string; reason?: string; device?: string }
    | null;

  if (!json?.id) return NextResponse.json({ ok: true });

  const reminder = await prisma.serviceReminder.findFirst({
    where: { fonnteMessageId: json.id },
  });
  if (!reminder) return NextResponse.json({ ok: true });

  const status = (json.status ?? "").toLowerCase();
  if (status === "sent" || status === "delivered" || status === "read") {
    await prisma.serviceReminder.update({
      where: { id: reminder.id },
      data: { status: "SENT", sentAt: reminder.sentAt ?? new Date() },
    });
  } else if (status === "failed" || status === "rejected") {
    await prisma.serviceReminder.update({
      where: { id: reminder.id },
      data: { status: "FAILED", errorMessage: json.reason ?? status },
    });
  }
  return NextResponse.json({ ok: true });
}
