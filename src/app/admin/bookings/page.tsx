import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdminBookingActions } from "@/components/admin-booking-actions";
import { prisma } from "@/lib/prisma";
import { SLOT_RULES } from "@/lib/slots";
import { formatDateID, formatIDR, formatTimeID } from "@/lib/utils";

export const dynamic = "force-dynamic";

const statusFilters = ["ALL", "PENDING", "CONFIRMED", "IN_PROGRESS", "DONE", "CANCELLED"] as const;

type Filter = (typeof statusFilters)[number];

export default async function AdminBookings({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; branchId?: string }>;
}) {
  const sp = await searchParams;
  const filter: Filter = (statusFilters as readonly string[]).includes(sp.status ?? "")
    ? (sp.status as Filter)
    : "ALL";
  const branchId = sp.branchId;

  const [bookings, branches] = await Promise.all([
    prisma.booking.findMany({
      where: {
        ...(filter !== "ALL" ? { status: filter } : {}),
        ...(branchId ? { branchId } : {}),
      },
      include: {
        branch: true,
        customer: true,
        motorcycle: true,
        services: { include: { service: true } },
      },
      orderBy: { scheduledAt: "desc" },
      take: 100,
    }),
    prisma.branch.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Manajemen booking</CardTitle>
          <CardDescription>
            Kapasitas harian per cabang: {SLOT_RULES.DAILY_BOOKING_CAP} motor.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {statusFilters.map((s) => (
            <Button
              key={s}
              asChild
              size="sm"
              variant={filter === s ? "default" : "soft"}
            >
              <Link
                href={{
                  pathname: "/admin/bookings",
                  query: { ...(s !== "ALL" ? { status: s } : {}), ...(branchId ? { branchId } : {}) },
                }}
              >
                {s}
              </Link>
            </Button>
          ))}
          <span className="mx-2 hidden h-6 w-px bg-[color:var(--color-border)] sm:inline" />
          <Button
            asChild
            size="sm"
            variant={!branchId ? "default" : "soft"}
          >
            <Link href={{ pathname: "/admin/bookings", query: { ...(filter !== "ALL" ? { status: filter } : {}) } }}>
              Semua cabang
            </Link>
          </Button>
          {branches.map((b) => (
            <Button
              key={b.id}
              asChild
              size="sm"
              variant={branchId === b.id ? "default" : "soft"}
            >
              <Link
                href={{
                  pathname: "/admin/bookings",
                  query: { ...(filter !== "ALL" ? { status: filter } : {}), branchId: b.id },
                }}
              >
                {b.name}
              </Link>
            </Button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {bookings.length === 0 ? (
            <p className="p-6 text-sm text-[color:var(--color-muted-fg)]">
              Tidak ada booking pada filter ini.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[color:var(--color-muted)] text-left text-xs uppercase tracking-wide text-[color:var(--color-muted-fg)]">
                  <tr>
                    <th className="px-4 py-3">Kode</th>
                    <th className="px-4 py-3">Pelanggan</th>
                    <th className="px-4 py-3">Motor</th>
                    <th className="px-4 py-3">Cabang</th>
                    <th className="px-4 py-3">Jadwal</th>
                    <th className="px-4 py-3">Layanan</th>
                    <th className="px-4 py-3">Estimasi</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--color-border)]">
                  {bookings.map((b) => (
                    <tr key={b.id} className="hover:bg-[color:var(--color-muted)]/30">
                      <td className="px-4 py-3 font-medium">{b.code}</td>
                      <td className="px-4 py-3">
                        <div>{b.customer.fullName}</div>
                        <div className="text-xs text-[color:var(--color-muted-fg)]">
                          {b.customer.phone ?? "-"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {b.motorcycle.brand} {b.motorcycle.model}
                        <div className="text-xs text-[color:var(--color-muted-fg)]">
                          {b.motorcycle.plateNumber}
                        </div>
                      </td>
                      <td className="px-4 py-3">{b.branch.name}</td>
                      <td className="px-4 py-3">
                        {formatDateID(b.scheduledAt)}
                        <div className="text-xs text-[color:var(--color-muted-fg)]">
                          {formatTimeID(b.scheduledAt)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {b.services.map((s) => s.service.name).join(", ")}
                      </td>
                      <td className="px-4 py-3">{formatIDR(b.estimatedTotal)}</td>
                      <td className="px-4 py-3">
                        <Badge tone={statusTone(b.status)}>{b.status}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <AdminBookingActions bookingId={b.id} status={b.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function statusTone(s: string): "default" | "primary" | "success" | "warning" | "danger" {
  switch (s) {
    case "DONE":
      return "success";
    case "CONFIRMED":
    case "IN_PROGRESS":
      return "primary";
    case "PENDING":
      return "warning";
    case "CANCELLED":
    case "NO_SHOW":
      return "danger";
    default:
      return "default";
  }
}
