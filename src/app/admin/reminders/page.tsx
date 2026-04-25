import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { formatDateID, formatTimeID } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminReminders() {
  const reminders = await prisma.serviceReminder.findMany({
    include: { user: true, booking: { include: { motorcycle: true, branch: true } } },
    orderBy: { scheduledFor: "desc" },
    take: 100,
  });

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Reminder WhatsApp</CardTitle>
          <CardDescription>
            Reminder otomatis 50 hari setelah transaksi DONE, dikirim via Fonnte.com.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[color:var(--color-muted)] text-left text-xs uppercase tracking-wide text-[color:var(--color-muted-fg)]">
                <tr>
                  <th className="px-4 py-3">Pelanggan</th>
                  <th className="px-4 py-3">Motor</th>
                  <th className="px-4 py-3">Cabang</th>
                  <th className="px-4 py-3">Jadwal</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--color-border)]">
                {reminders.map((r) => (
                  <tr key={r.id} className="hover:bg-[color:var(--color-muted)]/30">
                    <td className="px-4 py-3">
                      <div className="font-medium">{r.user.fullName}</div>
                      <div className="text-xs text-[color:var(--color-muted-fg)]">
                        {r.user.phone ?? "-"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {r.booking?.motorcycle
                        ? `${r.booking.motorcycle.brand} ${r.booking.motorcycle.model}`
                        : "-"}
                    </td>
                    <td className="px-4 py-3">{r.booking?.branch?.name ?? "-"}</td>
                    <td className="px-4 py-3">
                      {formatDateID(r.scheduledFor)} · {formatTimeID(r.scheduledFor)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={statusTone(r.status)}>{r.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-[color:var(--color-muted-fg)]">
                      {r.errorMessage ?? r.fonnteMessageId ?? "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function statusTone(s: string): "default" | "primary" | "success" | "warning" | "danger" {
  switch (s) {
    case "SENT":
      return "success";
    case "SCHEDULED":
      return "warning";
    case "FAILED":
      return "danger";
    case "CANCELLED":
      return "default";
    default:
      return "default";
  }
}
