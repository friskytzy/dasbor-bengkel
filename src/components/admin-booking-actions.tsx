"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

type Status = "PENDING" | "CONFIRMED" | "IN_PROGRESS" | "DONE" | "CANCELLED" | "NO_SHOW";

const ACTIVE: Status[] = ["PENDING", "CONFIRMED", "IN_PROGRESS"];

export function AdminBookingActions({
  bookingId,
  status,
}: {
  bookingId: string;
  status: Status;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!ACTIVE.includes(status)) {
    return <span className="text-xs text-[color:var(--color-muted-fg)]">—</span>;
  }

  async function cancel() {
    const reason = window.prompt("Alasan pembatalan? (opsional)");
    if (reason === null) return; // user dismissed the prompt
    if (!window.confirm("Yakin ingin membatalkan booking ini?")) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(reason && reason.trim() ? { reason: reason.trim() } : {}),
        });
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { message?: string };
          throw new Error(j.message ?? `HTTP ${res.status}`);
        }
        router.refresh();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex flex-wrap gap-1">
        <Button asChild size="sm" variant="default">
          <Link href={`/admin/bookings/${bookingId}/finalize`}>Selesaikan</Link>
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={cancel}
          disabled={pending}
        >
          {pending ? "Membatalkan…" : "Batalkan"}
        </Button>
      </div>
      {error ? (
        <span className="text-xs text-[color:var(--color-danger)]">{error}</span>
      ) : null}
    </div>
  );
}
