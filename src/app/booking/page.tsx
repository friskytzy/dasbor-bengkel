import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SiteHeader } from "@/components/site-header";
import { getOrCreateAppUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BookingForm } from "./booking-form";

export const dynamic = "force-dynamic";

export default async function BookingPage() {
  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  const [branches, services, motorcycles] = await Promise.all([
    prisma.branch.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.service.findMany({ where: { isActive: true }, orderBy: { price: "asc" } }),
    prisma.motorcycle.findMany({ where: { ownerId: user.id } }),
  ]);

  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-6 md:py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Booking servis</h1>
          <p className="text-sm text-[color:var(--color-muted-fg)]">
            Pilih cabang, motor, layanan, dan slot 45 menit yang tersedia.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Detail booking</CardTitle>
            <CardDescription>
              Slot dibuat tiap 45 menit antara 09.00–18.00 (jeda 12.00–13.00). Maks 11 motor / cabang / hari.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BookingForm
              branches={branches}
              services={services}
              motorcycles={motorcycles}
            />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
