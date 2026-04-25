import Link from "next/link";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-[color:var(--color-border)] bg-[color:var(--color-bg)]/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold">
          <span className="inline-block h-2 w-2 rounded-full bg-[color:var(--color-primary)]" />
          Dasbor Bengkel
          <span className="ml-1 hidden rounded-md bg-[color:var(--color-muted)] px-2 py-0.5 text-[10px] font-medium text-[color:var(--color-muted-fg)] sm:inline">
            Batam
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/booking"
            className="hidden rounded-md px-3 py-1.5 hover:bg-[color:var(--color-muted)] sm:inline-block"
          >
            Booking
          </Link>
          <Link
            href="/riwayat"
            className="hidden rounded-md px-3 py-1.5 hover:bg-[color:var(--color-muted)] sm:inline-block"
          >
            Riwayat
          </Link>
          <Link
            href="/admin"
            className="hidden rounded-md px-3 py-1.5 hover:bg-[color:var(--color-muted)] md:inline-block"
          >
            Admin
          </Link>
          <SignedOut>
            <Button asChild size="sm" variant="soft">
              <Link href="/sign-in">Masuk</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/sign-up">Daftar</Link>
            </Button>
          </SignedOut>
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </nav>
      </div>
    </header>
  );
}
