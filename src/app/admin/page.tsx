import Link from "next/link";
import { AlertTriangle, BellRing, CheckCircle2, Flame, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { SLOT_RULES } from "@/lib/slots";
import { formatDateID, formatIDR, formatTimeID } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);
  const past60 = new Date();
  past60.setDate(past60.getDate() - 60);

  const [
    todayBookings,
    bookingsByBranch,
    pendingBookings,
    overdueCustomers,
    revenueToday,
    failedReminders,
  ] = await Promise.all([
    prisma.booking.findMany({
      where: {
        scheduledAt: { gte: todayStart, lt: todayEnd },
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
      },
      include: { branch: true, customer: true, motorcycle: true },
      orderBy: { scheduledAt: "asc" },
    }),
    prisma.booking.groupBy({
      by: ["branchId"],
      where: {
        scheduledAt: { gte: todayStart, lt: todayEnd },
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
      },
      _count: { _all: true },
    }),
    prisma.booking.findMany({
      where: { status: "PENDING" },
      include: { branch: true, customer: true },
      orderBy: { scheduledAt: "asc" },
      take: 5,
    }),
    prisma.booking.findMany({
      where: {
        status: "DONE",
        doneAt: { lte: past60 },
        reminder: { is: null },
      },
      include: { customer: true, motorcycle: true, branch: true },
      take: 5,
    }),
    prisma.transaction.aggregate({
      where: { createdAt: { gte: todayStart, lt: todayEnd }, status: "PAID" },
      _sum: { total: true },
      _count: { _all: true },
    }),
    prisma.serviceReminder.count({ where: { status: "FAILED" } }),
  ]);

  const branches = await prisma.branch.findMany({ orderBy: { name: "asc" } });
  const usageMap = Object.fromEntries(
    bookingsByBranch.map((b) => [b.branchId, b._count._all]),
  );

  const fullBranches = branches.filter(
    (b) => (usageMap[b.id] ?? 0) >= SLOT_RULES.DAILY_BOOKING_CAP,
  );

  return (
    <div className="grid gap-6">
      {/* Proactive alerts */}
      <section className="grid gap-3 md:grid-cols-3">
        <AlertCard
          icon={Flame}
          tone="danger"
          title={`${fullBranches.length} cabang penuh hari ini`}
          description={
            fullBranches.length === 0
              ? "Semua cabang masih bisa menerima booking."
              : fullBranches.map((b) => b.name).join(", ")
          }
          ctaHref="/admin/bookings"
          cta="Lihat antrian"
        />
        <AlertCard
          icon={Users}
          tone="warning"
          title={`${overdueCustomers.length} pelanggan perlu di-follow up`}
          description={
            overdueCustomers.length === 0
              ? "Tidak ada pelanggan yang overdue."
              : `Sudah > 60 hari tanpa reminder otomatis.`
          }
          ctaHref="/admin/reminders"
          cta="Kirim reminder"
        />
        <AlertCard
          icon={BellRing}
          tone={failedReminders > 0 ? "danger" : "success"}
          title={`${failedReminders} reminder WA gagal kirim`}
          description={
            failedReminders === 0
              ? "Semua reminder terkirim. Fonnte sehat."
              : "Cek device Fonnte / kuota WhatsApp."
          }
          ctaHref="/admin/reminders"
          cta="Buka reminder"
        />
      </section>

      {/* KPI */}
      <section className="grid gap-4 md:grid-cols-4">
        <KPI label="Booking hari ini" value={todayBookings.length.toString()} />
        <KPI
          label="Pendapatan hari ini"
          value={formatIDR(revenueToday._sum.total ?? 0)}
        />
        <KPI label="Transaksi paid" value={(revenueToday._count._all ?? 0).toString()} />
        <KPI label="Pending booking" value={pendingBookings.length.toString()} />
      </section>

      {/* Per-branch capacity heatmap */}
      <Card>
        <CardHeader>
          <CardTitle>Kapasitas hari ini per cabang</CardTitle>
          <CardDescription>
            Hard-cap {SLOT_RULES.DAILY_BOOKING_CAP} motor / cabang / hari.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          {branches.map((b) => {
            const used = usageMap[b.id] ?? 0;
            const pct = Math.min(100, Math.round((used / SLOT_RULES.DAILY_BOOKING_CAP) * 100));
            const tone = pct >= 100 ? "danger" : pct >= 80 ? "warning" : "success";
            return (
              <div
                key={b.id}
                className="rounded-xl border border-[color:var(--color-border)] p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">{b.name}</div>
                  <Badge tone={tone}>
                    {used}/{SLOT_RULES.DAILY_BOOKING_CAP}
                  </Badge>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-[color:var(--color-muted)]">
                  <div
                    className="h-full bg-[color:var(--color-primary)]"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-[color:var(--color-muted-fg)]">
                  {b.address}
                </p>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Pending + overdue */}
      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pending konfirmasi</CardTitle>
            <CardDescription>Booking yang belum dikonfirmasi staf.</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingBookings.length === 0 ? (
              <Empty icon={CheckCircle2} text="Semua booking sudah dikonfirmasi 🎉" />
            ) : (
              <ul className="grid gap-2">
                {pendingBookings.map((b) => (
                  <li
                    key={b.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[color:var(--color-border)] p-3 text-sm"
                  >
                    <div>
                      <div className="font-medium">{b.code}</div>
                      <div className="text-xs text-[color:var(--color-muted-fg)]">
                        {b.customer.fullName} · {b.branch.name}
                      </div>
                    </div>
                    <span className="text-xs">
                      {formatDateID(b.scheduledAt)} · {formatTimeID(b.scheduledAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pelanggan overdue</CardTitle>
            <CardDescription>
              Sudah {">"} 60 hari sejak servis terakhir, belum di-reminder otomatis.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {overdueCustomers.length === 0 ? (
              <Empty icon={CheckCircle2} text="Semua pelanggan terjaga." />
            ) : (
              <ul className="grid gap-2">
                {overdueCustomers.map((b) => (
                  <li
                    key={b.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[color:var(--color-border)] p-3 text-sm"
                  >
                    <div>
                      <div className="font-medium">{b.customer.fullName}</div>
                      <div className="text-xs text-[color:var(--color-muted-fg)]">
                        {b.motorcycle.brand} {b.motorcycle.model} · {b.branch.name}
                      </div>
                    </div>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/admin/reminders?bookingId=${b.id}`}>Kirim WA</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function KPI({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

function AlertCard({
  icon: Icon,
  tone,
  title,
  description,
  ctaHref,
  cta,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone: "danger" | "warning" | "success" | "primary";
  title: string;
  description: string;
  ctaHref: string;
  cta: string;
}) {
  const toneClass = {
    danger: "from-[color:var(--color-danger)]/15",
    warning: "from-[color:var(--color-warning)]/15",
    success: "from-[color:var(--color-success)]/15",
    primary: "from-[color:var(--color-primary)]/15",
  }[tone];
  return (
    <Card className={`bg-gradient-to-br ${toneClass} to-transparent`}>
      <CardHeader>
        <span
          className={`inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[color:var(--color-card)] text-[color:var(--color-${
            tone === "primary" ? "primary" : tone
          })]`}
        >
          <Icon className="h-4 w-4" />
        </span>
        <CardTitle className="mt-2 text-sm">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild size="sm" variant="outline">
          <Link href={ctaHref}>{cta}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function Empty({
  icon: Icon,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-[color:var(--color-muted)] p-4 text-sm text-[color:var(--color-muted-fg)]">
      <Icon className="h-4 w-4" />
      {text}
    </div>
  );
}

// Suppress unused-import warning for AlertTriangle if all callsites resolved.
void AlertTriangle;
