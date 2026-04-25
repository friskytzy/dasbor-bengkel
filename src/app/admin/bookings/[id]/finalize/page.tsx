import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { formatDateID, formatIDR, formatTimeID } from "@/lib/utils";
import { FinalizeForm } from "./finalize-form";

export const dynamic = "force-dynamic";

export default async function FinalizeBookingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      branch: true,
      customer: { include: { loyalty: true } },
      motorcycle: true,
      services: { include: { service: true } },
    },
  });

  if (!booking) notFound();

  const services = booking.services.map((bs) => ({
    name: bs.service.name,
    quantity: bs.quantity,
    unitPrice: bs.priceSnapshot,
    lineTotal: bs.priceSnapshot * bs.quantity,
  }));
  const subtotalServices = services.reduce((acc, s) => acc + s.lineTotal, 0);
  const loyaltyBalance = booking.customer.loyalty?.balance ?? 0;

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-2">
          <div>
            <CardTitle>Selesaikan booking {booking.code}</CardTitle>
            <CardDescription>
              {booking.customer.fullName} · {booking.motorcycle.brand}{" "}
              {booking.motorcycle.model} ({booking.motorcycle.plateNumber})
            </CardDescription>
          </div>
          <Badge tone={booking.status === "DONE" ? "success" : "primary"}>
            {booking.status}
          </Badge>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <span className="text-[color:var(--color-muted-fg)]">Cabang</span>
            <div>{booking.branch.name}</div>
          </div>
          <div>
            <span className="text-[color:var(--color-muted-fg)]">Jadwal</span>
            <div>
              {formatDateID(booking.scheduledAt)} · {formatTimeID(booking.scheduledAt)}
            </div>
          </div>
          <div>
            <span className="text-[color:var(--color-muted-fg)]">Saldo poin pelanggan</span>
            <div className="font-medium">{loyaltyBalance.toLocaleString("id-ID")} poin</div>
          </div>
          <div>
            <span className="text-[color:var(--color-muted-fg)]">Estimasi awal</span>
            <div>{formatIDR(booking.estimatedTotal)}</div>
          </div>
        </CardContent>
      </Card>

      {booking.status === "DONE" ? (
        <Card>
          <CardContent className="flex flex-col gap-3 p-6">
            <p className="text-sm">
              Booking ini sudah selesai. Lihat invoice di{" "}
              <Link className="underline" href="/admin/transactions">
                halaman transaksi
              </Link>
              .
            </p>
            <div>
              <Button asChild size="sm" variant="soft">
                <Link href="/admin/bookings">Kembali ke daftar booking</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : booking.status === "CANCELLED" || booking.status === "NO_SHOW" ? (
        <Card>
          <CardContent className="flex flex-col gap-3 p-6">
            <p className="text-sm text-[color:var(--color-danger)]">
              Booking ini sudah {booking.status === "NO_SHOW" ? "dicatat sebagai NO_SHOW" : "dibatalkan"} dan tidak bisa diselesaikan.
            </p>
            <div>
              <Button asChild size="sm" variant="soft">
                <Link href="/admin/bookings">Kembali ke daftar booking</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <FinalizeForm
          bookingId={booking.id}
          services={services}
          subtotalServices={subtotalServices}
          loyaltyBalance={loyaltyBalance}
        />
      )}
    </div>
  );
}
