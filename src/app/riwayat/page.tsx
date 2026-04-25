import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getOrCreateAppUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDateID, formatIDR, formatTimeID } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function RiwayatPage() {
  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  const bookings = await prisma.booking.findMany({
    where: { customerId: user.id },
    orderBy: { scheduledAt: "desc" },
    include: {
      branch: true,
      motorcycle: true,
      services: { include: { service: true } },
      transaction: true,
    },
  });

  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-6 md:py-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Riwayat booking</h1>
            <p className="text-sm text-[color:var(--color-muted-fg)]">
              Semua booking, transaksi, dan reminder Anda.
            </p>
          </div>
          <Button asChild size="sm">
            <Link href="/booking">+ Booking baru</Link>
          </Button>
        </div>

        {bookings.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-[color:var(--color-muted-fg)]">
              Belum ada riwayat. <Link href="/booking" className="underline">Buat booking pertama</Link>.
            </CardContent>
          </Card>
        ) : (
          <ul className="grid gap-3">
            {bookings.map((b) => (
              <Card key={b.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="text-base">
                      {b.code} · {b.branch.name}
                    </CardTitle>
                    <Badge tone={statusTone(b.status)}>{b.status}</Badge>
                  </div>
                  <CardDescription>
                    {formatDateID(b.scheduledAt)} · {formatTimeID(b.scheduledAt)} · {b.motorcycle.brand} {b.motorcycle.model} ({b.motorcycle.plateNumber})
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-2 text-sm">
                  <ul className="grid gap-1">
                    {b.services.map((bs) => (
                      <li key={bs.id} className="flex items-center justify-between">
                        <span>{bs.service.name}</span>
                        <span className="text-[color:var(--color-muted-fg)]">
                          {formatIDR(bs.priceSnapshot)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[color:var(--color-border)] pt-2 text-xs">
                    <span className="text-[color:var(--color-muted-fg)]">
                      Estimasi: {formatIDR(b.estimatedTotal)}
                    </span>
                    {b.transaction ? (
                      <span>
                        Invoice <strong>{b.transaction.invoiceNumber}</strong> · Total{" "}
                        <strong>{formatIDR(b.transaction.total)}</strong> · Poin +
                        <strong>{b.transaction.earnedPoints}</strong>
                      </span>
                    ) : (
                      <span className="text-[color:var(--color-muted-fg)]">
                        Belum ada invoice
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </ul>
        )}
      </main>
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
