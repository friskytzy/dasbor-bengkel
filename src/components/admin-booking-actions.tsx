"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Status = "PENDING" | "CONFIRMED" | "IN_PROGRESS" | "DONE" | "CANCELLED" | "NO_SHOW";

const ACTIVE: Status[] = ["PENDING", "CONFIRMED", "IN_PROGRESS"];

export function AdminBookingActions({
  bookingId,
  bookingCode,
  status,
}: {
  bookingId: string;
  bookingCode?: string;
  status: Status;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  if (!ACTIVE.includes(status)) {
    return <span className="text-xs text-[color:var(--color-muted-fg)]">—</span>;
  }

  function submitCancel(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const trimmed = reason.trim();
    startTransition(async () => {
      try {
        const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(trimmed ? { reason: trimmed } : {}),
        });
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { message?: string };
          throw new Error(j.message ?? `HTTP ${res.status}`);
        }
        setOpen(false);
        setReason("");
        router.refresh();
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex flex-wrap gap-1">
        <Button asChild size="sm" variant="default">
          <Link href={`/admin/bookings/${bookingId}/finalize`}>Selesaikan</Link>
        </Button>
        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) setError(null);
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm" variant="destructive">
              Batalkan
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={submitCancel} className="grid gap-4">
              <DialogHeader>
                <DialogTitle>Batalkan booking{bookingCode ? ` ${bookingCode}` : ""}?</DialogTitle>
                <DialogDescription>
                  Aksi ini tidak bisa di-undo. Slot akan dilepas kembali ke
                  cabang dan masuk ke audit log.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-2">
                <Label htmlFor={`reason-${bookingId}`}>
                  Alasan{" "}
                  <span className="text-xs text-[color:var(--color-muted-fg)]">
                    (opsional, masuk ke notes &amp; audit log)
                  </span>
                </Label>
                <Textarea
                  id={`reason-${bookingId}`}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="mis. Pelanggan reschedule via WA"
                  maxLength={500}
                  disabled={pending}
                />
              </div>
              {error ? (
                <p className="text-sm text-[color:var(--color-danger)]">{error}</p>
              ) : null}
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="soft" disabled={pending}>
                    Tutup
                  </Button>
                </DialogClose>
                <Button type="submit" variant="destructive" disabled={pending}>
                  {pending ? "Membatalkan…" : "Ya, batalkan"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
