"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatIDR } from "@/lib/utils";
import {
  LOYALTY_RULES,
  calculateEarnedPoints,
  calculateRedeemDiscount,
} from "@/lib/loyalty-rules";

type Service = {
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

type ExtraItem = {
  description: string;
  unitPrice: number;
  quantity: number;
};

const PAYMENT_METHODS = ["CASH", "TRANSFER", "QRIS", "DEBIT"] as const;
type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export function FinalizeForm({
  bookingId,
  services,
  subtotalServices,
  loyaltyBalance,
}: {
  bookingId: string;
  services: Service[];
  subtotalServices: number;
  loyaltyBalance: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [redeemPointsInput, setRedeemPointsInput] = useState<string>("0");
  const [extras, setExtras] = useState<ExtraItem[]>([]);

  const subtotalExtras = useMemo(
    () => extras.reduce((a, e) => a + e.unitPrice * e.quantity, 0),
    [extras],
  );
  const subtotal = subtotalServices + subtotalExtras;

  const requestedRedeem = Math.max(
    0,
    Math.min(loyaltyBalance, parseInt(redeemPointsInput, 10) || 0),
  );
  const { validPoints: redeemedPoints, discount: discountAmount } =
    calculateRedeemDiscount(requestedRedeem);
  const total = Math.max(0, subtotal - discountAmount);
  const earnedPoints = calculateEarnedPoints(total);

  function addExtra() {
    setExtras((p) => [
      ...p,
      { description: "", unitPrice: 0, quantity: 1 },
    ]);
  }
  function updateExtra(idx: number, patch: Partial<ExtraItem>) {
    setExtras((p) => p.map((e, i) => (i === idx ? { ...e, ...patch } : e)));
  }
  function removeExtra(idx: number) {
    setExtras((p) => p.filter((_, i) => i !== idx));
  }

  function submit() {
    setError(null);
    // sanitize extras: drop empty rows
    const cleanExtras = extras
      .map((e) => ({
        description: e.description.trim(),
        unitPrice: Number(e.unitPrice) || 0,
        quantity: Number(e.quantity) || 1,
      }))
      .filter((e) => e.description.length > 0 && e.unitPrice >= 0 && e.quantity >= 1);

    startTransition(async () => {
      try {
        const res = await fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookingId,
            paymentMethod,
            redeemPoints: redeemedPoints,
            extraItems: cleanExtras.length ? cleanExtras : undefined,
          }),
        });
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { message?: string };
          throw new Error(j.message ?? `HTTP ${res.status}`);
        }
        router.push("/admin/transactions");
        router.refresh();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Buat invoice</CardTitle>
        <CardDescription>
          Aturan loyalty: {LOYALTY_RULES.EARN_POINTS} poin per Rp{" "}
          {LOYALTY_RULES.EARN_PER_RUPIAH.toLocaleString("id-ID")}; redeem mulai{" "}
          {LOYALTY_RULES.REDEEM_MIN_POINTS} poin = diskon Rp{" "}
          {LOYALTY_RULES.REDEEM_VALUE_PER_STEP.toLocaleString("id-ID")}.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <section>
          <h3 className="mb-2 text-sm font-medium">Layanan dari booking</h3>
          <ul className="divide-y divide-[color:var(--color-border)] rounded-lg border border-[color:var(--color-border)]">
            {services.map((s, i) => (
              <li key={i} className="flex items-center justify-between px-3 py-2 text-sm">
                <div>
                  <div>{s.name}</div>
                  <div className="text-xs text-[color:var(--color-muted-fg)]">
                    {s.quantity}× {formatIDR(s.unitPrice)}
                  </div>
                </div>
                <div className="font-medium">{formatIDR(s.lineTotal)}</div>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-medium">Item tambahan (opsional)</h3>
            <Button type="button" size="sm" variant="soft" onClick={addExtra}>
              + Tambah item
            </Button>
          </div>
          {extras.length === 0 ? (
            <p className="text-xs text-[color:var(--color-muted-fg)]">
              Tidak ada item tambahan.
            </p>
          ) : (
            <ul className="grid gap-2">
              {extras.map((e, idx) => (
                <li
                  key={idx}
                  className="grid items-end gap-2 rounded-lg border border-[color:var(--color-border)] p-3 sm:grid-cols-[1fr_120px_80px_auto]"
                >
                  <div className="grid gap-1">
                    <Label htmlFor={`ed-${idx}`}>Deskripsi</Label>
                    <Input
                      id={`ed-${idx}`}
                      value={e.description}
                      onChange={(ev) =>
                        updateExtra(idx, { description: ev.target.value })
                      }
                      placeholder="Mis. Ganti baut, sparepart X"
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor={`ep-${idx}`}>Harga satuan</Label>
                    <Input
                      id={`ep-${idx}`}
                      type="number"
                      min={0}
                      step={500}
                      value={e.unitPrice}
                      onChange={(ev) =>
                        updateExtra(idx, {
                          unitPrice: parseInt(ev.target.value, 10) || 0,
                        })
                      }
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor={`eq-${idx}`}>Qty</Label>
                    <Input
                      id={`eq-${idx}`}
                      type="number"
                      min={1}
                      step={1}
                      value={e.quantity}
                      onChange={(ev) =>
                        updateExtra(idx, {
                          quantity: parseInt(ev.target.value, 10) || 1,
                        })
                      }
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => removeExtra(idx)}
                  >
                    Hapus
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1">
            <Label>Metode pembayaran</Label>
            <div className="flex flex-wrap gap-2">
              {PAYMENT_METHODS.map((m) => (
                <Button
                  key={m}
                  type="button"
                  size="sm"
                  variant={paymentMethod === m ? "default" : "soft"}
                  onClick={() => setPaymentMethod(m)}
                >
                  {m}
                </Button>
              ))}
            </div>
          </div>
          <div className="grid gap-1">
            <Label htmlFor="redeem">
              Tukar poin{" "}
              <span className="text-xs text-[color:var(--color-muted-fg)]">
                (saldo {loyaltyBalance.toLocaleString("id-ID")} poin)
              </span>
            </Label>
            <Input
              id="redeem"
              type="number"
              min={0}
              max={loyaltyBalance}
              step={100}
              value={redeemPointsInput}
              onChange={(ev) => setRedeemPointsInput(ev.target.value)}
            />
            <p className="text-xs text-[color:var(--color-muted-fg)]">
              Akan dipakai: {redeemedPoints.toLocaleString("id-ID")} poin → diskon{" "}
              {formatIDR(discountAmount)}
            </p>
          </div>
        </section>

        <section className="grid gap-1 rounded-lg bg-[color:var(--color-muted)]/40 p-4 text-sm">
          <div className="flex justify-between">
            <span>Subtotal layanan</span>
            <span>{formatIDR(subtotalServices)}</span>
          </div>
          <div className="flex justify-between">
            <span>Subtotal item tambahan</span>
            <span>{formatIDR(subtotalExtras)}</span>
          </div>
          <div className="flex justify-between">
            <span>Diskon poin</span>
            <span>− {formatIDR(discountAmount)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-[color:var(--color-border)] pt-2">
            <span className="font-medium">Total dibayar</span>
            <span className="text-lg font-semibold">{formatIDR(total)}</span>
          </div>
          <div className="flex justify-between text-xs text-[color:var(--color-muted-fg)]">
            <span>Poin akan didapat</span>
            <Badge tone="primary">+{earnedPoints} poin</Badge>
          </div>
        </section>

        {error ? (
          <p className="text-sm text-[color:var(--color-danger)]">{error}</p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button onClick={submit} disabled={pending} size="lg">
            {pending ? "Memproses…" : "Selesaikan & buat invoice"}
          </Button>
          <Button asChild variant="soft" size="lg">
            <Link href="/admin/bookings">Batal</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
