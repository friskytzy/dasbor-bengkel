import Link from "next/link";
import {
  CalendarCheck2,
  Gift,
  ShieldCheck,
  Sparkles,
  Wrench,
  Clock4,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SiteHeader } from "@/components/site-header";
import { formatIDR } from "@/lib/utils";

const featureCards = [
  {
    icon: CalendarCheck2,
    title: "Booking 45 menit",
    description:
      "Slot mekanik di-generate otomatis dari 09:00 sampai 18:00 dengan jeda istirahat siang. Pesan online, datang langsung dilayani.",
  },
  {
    icon: Gift,
    title: "Loyalty hemat",
    description:
      "Tiap kelipatan Rp 10.000 dapat 10 poin. Tukar mulai 100 poin untuk diskon Rp 10.000. Berlaku 12 bulan.",
  },
  {
    icon: ShieldCheck,
    title: "Reminder WhatsApp",
    description:
      "50 hari setelah servis, kami otomatis kirim reminder via WhatsApp lewat Fonnte agar motor tetap prima.",
  },
  {
    icon: Sparkles,
    title: "Kapasitas terjaga",
    description:
      "Maksimal 11 motor per cabang per hari supaya kualitas pengerjaan tetap konsisten dan tidak antre lama.",
  },
];

const services = [
  { name: "Servis Ringan", price: 35_000, type: "Tune-up dasar" },
  { name: "Ganti Oli", price: 45_000, type: "Oli + filter" },
  { name: "Servis Berat", price: 250_000, type: "Overhaul mesin" },
  { name: "Tune Up Injeksi", price: 95_000, type: "Diagnosa + setting" },
];

const branches = [
  { name: "Cabang Batu Aji", address: "Jl. Letjen Suprapto, Batu Aji" },
  { name: "Cabang Bengkong", address: "Jl. Bengkong Laut, Bengkong" },
  { name: "Cabang Sagulung", address: "Jl. Brigjen Katamso, Sagulung" },
];

export default function LandingPage() {
  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <main className="mx-auto flex max-w-6xl flex-col gap-16 px-4 pb-24 pt-10 sm:pt-16">
        <section className="grid items-center gap-10 md:grid-cols-2">
          <div className="flex flex-col gap-5">
            <Badge tone="primary" className="w-fit">
              <Sparkles className="h-3 w-3" />
              Spesialis motor di Batam
            </Badge>
            <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">
              Bengkel motor profesional, sekarang juga punya{" "}
              <span className="text-[color:var(--color-primary)]">dasbor digital</span>.
            </h1>
            <p className="max-w-prose text-base text-[color:var(--color-muted-fg)] sm:text-lg">
              Booking online dalam 45 menit, transparan dari awal sampai selesai.
              Loyalty otomatis, reminder WhatsApp 50 hari, dan dashboard real-time
              buat tim cabang.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="lg">
                <Link href="/booking">Pesan slot servis</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/admin">Lihat dashboard admin</Link>
              </Button>
            </div>
            <div className="flex items-center gap-4 text-xs text-[color:var(--color-muted-fg)]">
              <span className="inline-flex items-center gap-1">
                <Clock4 className="h-3.5 w-3.5" /> 09.00 – 18.00 WIB
              </span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> Batu Aji • Bengkong • Sagulung
              </span>
            </div>
          </div>
          <Card className="bg-gradient-to-br from-[color:var(--color-primary)]/5 to-[color:var(--color-accent)]/10">
            <CardHeader>
              <CardTitle>Pilihan layanan favorit</CardTitle>
              <CardDescription>Harga jujur, tanpa ada biaya tersembunyi.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {services.map((s) => (
                <div
                  key={s.name}
                  className="flex items-center justify-between rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-card)] p-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="rounded-lg bg-[color:var(--color-primary)]/10 p-2 text-[color:var(--color-primary)]">
                      <Wrench className="h-4 w-4" />
                    </span>
                    <div>
                      <div className="text-sm font-medium">{s.name}</div>
                      <div className="text-xs text-[color:var(--color-muted-fg)]">{s.type}</div>
                    </div>
                  </div>
                  <span className="text-sm font-semibold">{formatIDR(s.price)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {featureCards.map((f) => (
            <Card key={f.title}>
              <CardHeader>
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[color:var(--color-primary)]/10 text-[color:var(--color-primary)]">
                  <f.icon className="h-4 w-4" />
                </span>
                <CardTitle className="mt-2 text-sm">{f.title}</CardTitle>
                <CardDescription>{f.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          {branches.map((b) => (
            <Card key={b.name}>
              <CardHeader>
                <CardTitle>{b.name}</CardTitle>
                <CardDescription>{b.address}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/booking?branch=${encodeURIComponent(b.name)}`}>
                    Booking di sini
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </section>
      </main>
      <footer className="border-t border-[color:var(--color-border)] py-8 text-center text-xs text-[color:var(--color-muted-fg)]">
        © {new Date().getFullYear()} Dasbor Bengkel · Batam · Powered by Next.js, Clerk &amp; Fonnte.
      </footer>
    </div>
  );
}
