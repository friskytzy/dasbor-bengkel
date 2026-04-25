# Dasbor Bengkel

Sistem manajemen bengkel motor spesialis Batam — booking online 45 menit, loyalty otomatis,
reminder WhatsApp 50 hari, dan dashboard admin real-time.

**Stack**

- [Next.js 15](https://nextjs.org/) App Router (frontend + backend via API routes)
- [Clerk](https://clerk.com/) untuk auth
- [Prisma](https://www.prisma.io/) + PostgreSQL (Railway)
- [Tailwind CSS v4](https://tailwindcss.com/) + Shadcn/UI primitives
- [Fonnte.com](https://fonnte.com/) untuk WhatsApp gateway
- Redis (queue / rate-limit, opsional)

---

## Quick start

```bash
cp .env.example .env.local       # isi DATABASE_URL, CLERK_*, FONNTE_API_KEY
npm install
npx prisma migrate dev --name init
npm run db:seed                  # 3 cabang Batam, 7 services, 21 user, 50 booking
npm run dev
```

App jalan di http://localhost:3000.

| Path | Deskripsi |
| --- | --- |
| `/` | Landing page |
| `/booking` | Form booking 45-menit |
| `/riwayat` | Riwayat booking + transaksi pelanggan |
| `/admin` | Dashboard admin real-time + alert proaktif |
| `/admin/bookings` | Manajemen booking (filter status/cabang) |
| `/admin/transactions` | Daftar transaksi + poin loyalty |
| `/admin/reminders` | Status reminder WhatsApp via Fonnte |

---

## Deliverables (sesuai spesifikasi)

Lihat [`docs/architecture.md`](./docs/architecture.md) untuk:

1. **Struktur folder**
2. **prisma/schema.prisma** — kode lengkap di [`prisma/schema.prisma`](./prisma/schema.prisma)
3. **Desain arsitektur API endpoints**
4. **Spesifikasi UI 5 halaman**
5. **Konfigurasi GitHub Actions** — lihat [`.github/workflows`](./.github/workflows)

---

## Aturan bisnis

### Loyalty
- 10 poin per kelipatan **Rp 10.000** (subtotal sebelum diskon poin).
- Penukaran minimum **100 poin = Rp 10.000** (kelipatan 100).
- Masa berlaku poin **12 bulan**, FIFO saat redeem/expire.
- Implementasi: [`src/lib/loyalty.ts`](./src/lib/loyalty.ts)

### Booking & Slot Mekanik
- Interval slot **45 menit**, 09:00 – 18:00, jeda 12:00 – 13:00.
- Maks **11 motor / cabang / hari** (hard cap, ditolak otomatis).
- Implementasi: [`src/lib/slots.ts`](./src/lib/slots.ts), [`src/lib/bookings.ts`](./src/lib/bookings.ts)

### Reminder Servis
- Otomatis dijadwalkan H+50 setelah transaksi `DONE`.
- Dikirim via Fonnte (`/api/cron/reminders`) — auto-expire poin juga di-trigger di sini.
- Cron disetel via GitHub Actions ([`cron-reminders.yml`](./.github/workflows/cron-reminders.yml)) atau scheduler Railway/Vercel.

---

## Environment variables

| Var | Wajib | Catatan |
| --- | --- | --- |
| `DATABASE_URL` | ✓ | PostgreSQL Railway |
| `CLERK_SECRET_KEY` | ✓ | server |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | ✓ | client |
| `FONNTE_API_KEY` | ✓ | device token |
| `NEXT_PUBLIC_APP_URL` | ✓ | dipakai untuk URL booking di pesan WA |
| `REDIS_URL` |   | opsional (queue / rate-limit) |
| `CRON_SECRET` | ✓ | proteksi `/api/cron/*` |
| `ADMIN_USER_IDS` |   | comma-separated Clerk userId yang otomatis ADMIN |

---

## Scripts

```bash
npm run dev               # next dev
npm run build             # prisma generate && next build
npm run start             # next start
npm run lint              # next lint
npm run typecheck         # tsc --noEmit
npm run prisma:migrate    # prisma migrate dev
npm run prisma:deploy     # prisma migrate deploy (prod)
npm run db:seed           # seed 3 cabang + 20 user + 50 booking
npm run cron:reminders    # CLI runner untuk reminder + expire
```
