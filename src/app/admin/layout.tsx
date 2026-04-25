import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { getOrCreateAppUser } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
    return (
      <div className="min-h-dvh">
        <SiteHeader />
        <main className="mx-auto max-w-md px-4 py-20 text-center">
          <h1 className="text-xl font-semibold">Akses ditolak</h1>
          <p className="mt-2 text-sm text-[color:var(--color-muted-fg)]">
            Halaman ini hanya untuk admin. Hubungi pemilik bengkel untuk diberi akses.
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 md:py-10">
        <nav className="flex flex-wrap gap-1 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-card)] p-1 text-sm">
          <Link
            href="/admin"
            className="flex-1 rounded-lg px-3 py-2 text-center font-medium hover:bg-[color:var(--color-muted)]"
          >
            Dashboard
          </Link>
          <Link
            href="/admin/bookings"
            className="flex-1 rounded-lg px-3 py-2 text-center font-medium hover:bg-[color:var(--color-muted)]"
          >
            Booking
          </Link>
          <Link
            href="/admin/transactions"
            className="flex-1 rounded-lg px-3 py-2 text-center font-medium hover:bg-[color:var(--color-muted)]"
          >
            Transaksi
          </Link>
          <Link
            href="/admin/reminders"
            className="flex-1 rounded-lg px-3 py-2 text-center font-medium hover:bg-[color:var(--color-muted)]"
          >
            Reminder
          </Link>
          <Link
            href="/admin/audit"
            className="flex-1 rounded-lg px-3 py-2 text-center font-medium hover:bg-[color:var(--color-muted)]"
          >
            Audit
          </Link>
        </nav>
        {children}
      </div>
    </div>
  );
}
