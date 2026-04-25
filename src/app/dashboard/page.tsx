import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SiteHeader } from "@/components/site-header";
import { getOrCreateAppUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatIDR, formatDateID, formatTimeID } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardHome() {
  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  const [bookings, loyalty] = await Promise.all([
    prisma.booking.findMany({
      where: { customerId: user.id },
      orderBy: { scheduledAt: "desc" },
      include: { branch: true, motorcycle: true },
      take: 5,
    }),
    prisma.loyaltyPoint.findUnique({ where: { userId: user.id } }),
  ]);

  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 md:py-10">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Halo, {user.fullName}</h1>
            <p className="text-sm text-[color:var(--color-muted-fg)]">
              Pantau booking, loyalty, dan reminder servis Anda.
            </p>
          </div>
          <Button asChild>
            <Link href="/booking">+ Booking baru</Link>
          </Button>
        </div>

        <section className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader>
              <CardDescription>Saldo Loyalty</CardDescription>
              <CardTitle className="text-3xl">
                {loyalty?.balance ?? 0}{" "}
                <span className="text-base font-normal text-[color:var(--color-muted-fg)]">poin</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-[color:var(--color-muted-fg)]">
                Tukar mulai 100 poin = diskon Rp 10.000.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Total Diterbitkan</CardDescription>
              <CardTitle className="text-3xl">{loyalty?.lifetimeEarned ?? 0}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-[color:var(--color-muted-fg)]">
                Akumulasi seumur hidup.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Total Ditukar</CardDescription>
              <CardTitle className="text-3xl">{loyalty?.lifetimeRedeemed ?? 0}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-[color:var(--color-muted-fg)]">
                Setara {formatIDR(((loyalty?.lifetimeRedeemed ?? 0) / 100) * 10_000)}.
              </p>
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Booking terbaru</CardTitle>
            <CardDescription>5 booking terakhir Anda.</CardDescription>
          </CardHeader>
          <CardContent>
            {bookings.length === 0 ? (
              <p className="text-sm text-[color:var(--color-muted-fg)]">
                Belum ada booking.{" "}
                <Link href="/booking" className="text-[color:var(--color-primary)] underline">
                  Booking sekarang
                </Link>
                .
              </p>
            ) : (
              <ul className="divide-y divide-[color:var(--color-border)]">
                {bookings.map((b) => (
                  <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <div>
                      <div className="text-sm font-medium">
                        {b.code} · {b.branch.name}
                      </div>
                      <div className="text-xs text-[color:var(--color-muted-fg)]">
                        {formatDateID(b.scheduledAt)} · {formatTimeID(b.scheduledAt)} ·{" "}
                        {b.motorcycle.brand} {b.motorcycle.model}
                      </div>
                    </div>
                    <Badge tone={statusTone(b.status)}>{b.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
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
