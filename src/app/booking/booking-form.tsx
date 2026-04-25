"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { Branch, Motorcycle, Service } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatIDR } from "@/lib/utils";

type Slot = { id: string; startTime: string; endTime: string; available: boolean; remaining: number };

export function BookingForm(props: {
  branches: Branch[];
  services: Service[];
  motorcycles: Motorcycle[];
}) {
  const router = useRouter();
  const [branchId, setBranchId] = React.useState(props.branches[0]?.id ?? "");
  const [date, setDate] = React.useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [serviceIds, setServiceIds] = React.useState<string[]>([]);
  const [motorcycleId, setMotorcycleId] = React.useState(props.motorcycles[0]?.id ?? "");
  const [plate, setPlate] = React.useState("");
  const [brand, setBrand] = React.useState("");
  const [model, setModel] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [slots, setSlots] = React.useState<Slot[]>([]);
  const [slotId, setSlotId] = React.useState<string>("");
  const [loadingSlots, setLoadingSlots] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const selectedTotal = React.useMemo(
    () =>
      props.services
        .filter((s) => serviceIds.includes(s.id))
        .reduce((acc, s) => acc + s.price, 0),
    [serviceIds, props.services],
  );

  React.useEffect(() => {
    if (!branchId || !date) return;
    setLoadingSlots(true);
    setError(null);
    fetch(`/api/slots?branchId=${branchId}&date=${date}`)
      .then((r) => r.json())
      .then((j) => {
        setSlots(j.slots ?? []);
        setSlotId("");
      })
      .catch(() => setError("Gagal memuat slot"))
      .finally(() => setLoadingSlots(false));
  }, [branchId, date]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId,
          slotId,
          serviceIds,
          notes,
          motorcycleId: motorcycleId || undefined,
          newMotorcycle:
            !motorcycleId && plate
              ? { plateNumber: plate, brand, model }
              : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Booking gagal");
      router.push(`/riwayat?new=${json.booking.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="branch">Cabang</Label>
          <select
            id="branch"
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            className="h-10 rounded-lg border border-[color:var(--color-border)] bg-transparent px-3 text-sm"
          >
            {props.branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} — {b.address}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="date">Tanggal</Label>
          <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label>Motor</Label>
        {props.motorcycles.length > 0 && (
          <select
            value={motorcycleId}
            onChange={(e) => setMotorcycleId(e.target.value)}
            className="h-10 rounded-lg border border-[color:var(--color-border)] bg-transparent px-3 text-sm"
          >
            <option value="">+ Tambah motor baru</option>
            {props.motorcycles.map((m) => (
              <option key={m.id} value={m.id}>
                {m.plateNumber} — {m.brand} {m.model}
              </option>
            ))}
          </select>
        )}
        {!motorcycleId && (
          <div className="grid gap-2 rounded-lg border border-dashed border-[color:var(--color-border)] p-3 sm:grid-cols-3">
            <Input
              placeholder="Plat (BP 1234 XX)"
              value={plate}
              onChange={(e) => setPlate(e.target.value.toUpperCase())}
              required={!motorcycleId}
            />
            <Input
              placeholder="Merk (Honda/Yamaha)"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              required={!motorcycleId}
            />
            <Input
              placeholder="Model (Vario 150)"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              required={!motorcycleId}
            />
          </div>
        )}
      </div>

      <div className="grid gap-2">
        <Label>Layanan</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          {props.services.map((s) => {
            const checked = serviceIds.includes(s.id);
            return (
              <label
                key={s.id}
                className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 text-sm transition-colors ${
                  checked
                    ? "border-[color:var(--color-primary)] bg-[color:var(--color-primary)]/5"
                    : "border-[color:var(--color-border)]"
                }`}
              >
                <span>
                  <span className="block font-medium">{s.name}</span>
                  <span className="text-xs text-[color:var(--color-muted-fg)]">
                    {s.estimatedMinutes} menit · {s.type.replaceAll("_", " ")}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="font-semibold">{formatIDR(s.price)}</span>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) =>
                      setServiceIds((prev) =>
                        e.target.checked
                          ? [...prev, s.id]
                          : prev.filter((id) => id !== s.id),
                      )
                    }
                  />
                </span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label>Slot waktu (45 menit)</Label>
          {loadingSlots && (
            <span className="text-xs text-[color:var(--color-muted-fg)]">Memuat…</span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {slots.length === 0 && !loadingSlots && (
            <span className="col-span-full text-xs text-[color:var(--color-muted-fg)]">
              Belum ada slot. Pilih tanggal lain.
            </span>
          )}
          {slots.map((s) => (
            <button
              key={s.id}
              type="button"
              disabled={!s.available}
              onClick={() => setSlotId(s.id)}
              className={`rounded-lg border p-2 text-xs transition-colors ${
                slotId === s.id
                  ? "border-[color:var(--color-primary)] bg-[color:var(--color-primary)]/10"
                  : "border-[color:var(--color-border)] hover:bg-[color:var(--color-muted)]"
              } ${!s.available ? "cursor-not-allowed opacity-50" : ""}`}
            >
              <div className="font-medium">
                {new Date(s.startTime).toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                })}
              </div>
              <div className="text-[10px] text-[color:var(--color-muted-fg)]">
                Sisa {s.remaining}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="notes">Catatan (opsional)</Label>
        <Input
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Mis. mesin sering brebet saat panas"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[color:var(--color-border)] pt-4">
        <div className="text-sm">
          <div className="text-[color:var(--color-muted-fg)]">Estimasi</div>
          <div className="text-lg font-semibold">{formatIDR(selectedTotal)}</div>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="primary">Slot 45 menit</Badge>
          <Button type="submit" disabled={submitting || !slotId || serviceIds.length === 0}>
            {submitting ? "Memproses…" : "Konfirmasi booking"}
          </Button>
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-[color:var(--color-danger)]/10 p-3 text-sm text-[color:var(--color-danger)]">
          {error}
        </p>
      )}
    </form>
  );
}
