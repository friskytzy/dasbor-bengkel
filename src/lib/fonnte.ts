/**
 * Klien Fonnte (https://fonnte.com) untuk kirim WhatsApp.
 * Gunakan FONNTE_API_KEY (device token) yang di-set di env.
 */

const FONNTE_API_URL = process.env.FONNTE_API_URL || "https://api.fonnte.com/send";

export type FonnteSendArgs = {
  /** Nomor tujuan, format internasional tanpa "+" (mis. 6281234567890). */
  target: string;
  message: string;
  /** Optional URL media (gambar/pdf). */
  url?: string;
  /** Delay pengiriman dalam detik (default 0). */
  delay?: number;
};

export type FonnteResult = {
  ok: boolean;
  id?: string;
  reason?: string;
  raw?: unknown;
};

export async function sendWhatsApp(args: FonnteSendArgs): Promise<FonnteResult> {
  const token = process.env.FONNTE_API_KEY;
  if (!token) {
    return { ok: false, reason: "FONNTE_API_KEY belum di-set" };
  }

  const form = new FormData();
  form.append("target", args.target);
  form.append("message", args.message);
  if (args.url) form.append("url", args.url);
  if (args.delay !== undefined) form.append("delay", String(args.delay));

  try {
    const res = await fetch(FONNTE_API_URL, {
      method: "POST",
      headers: { Authorization: token },
      body: form,
    });
    const json = (await res.json().catch(() => null)) as
      | { status?: boolean; id?: string[] | string; reason?: string }
      | null;
    if (!res.ok || !json || json.status === false) {
      return {
        ok: false,
        reason: json?.reason || `HTTP ${res.status}`,
        raw: json,
      };
    }
    const id = Array.isArray(json.id) ? json.id[0] : json.id;
    return { ok: true, id, raw: json };
  } catch (err) {
    return { ok: false, reason: (err as Error).message };
  }
}

/** Normalisasi nomor HP Indonesia ke format Fonnte (62xxxxxx). */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return "62" + digits.slice(1);
  if (digits.startsWith("8")) return "62" + digits;
  return digits;
}

export function buildServiceReminderMessage(args: {
  customerName: string;
  motorcycle: string;
  branchName: string;
  daysSinceService: number;
  bookingUrl: string;
}): string {
  return [
    `Halo ${args.customerName}, ini reminder dari Dasbor Bengkel ${args.branchName}.`,
    ``,
    `Motor *${args.motorcycle}* terakhir servis ${args.daysSinceService} hari lalu.`,
    `Sudah saatnya servis berkala lagi biar performa motor tetap prima.`,
    ``,
    `Booking online: ${args.bookingUrl}`,
    ``,
    `Balas pesan ini kalau butuh bantuan ya 🙌`,
  ].join("\n");
}
