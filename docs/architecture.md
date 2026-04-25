# Dasbor Bengkel — Architecture & Deliverables

> Dokumen ini mengonsolidasikan 5 deliverable yang diminta:
>   1. Struktur folder
>   2. `prisma/schema.prisma` (lihat file aktual)
>   3. Desain arsitektur API endpoints
>   4. Spesifikasi UI 5 halaman
>   5. Konfigurasi GitHub Actions untuk CI/CD

---

## 1) Struktur folder

```
dasbor-bengkel/
├── .github/
│   └── workflows/
│       ├── ci.yml                       # lint, typecheck, prisma validate, build
│       └── cron-reminders.yml           # daily WA reminder trigger
├── prisma/
│   ├── schema.prisma                    # tabel utama + tabel pendukung
│   └── seed.ts                          # 3 cabang, 7 services, 21 user, 50 booking
├── public/
├── scripts/
│   └── send-reminders.ts                # CLI cron runner (opsional)
├── src/
│   ├── app/
│   │   ├── layout.tsx                   # ClerkProvider + global shell
│   │   ├── globals.css                  # Tailwind v4 tokens (oklch)
│   │   ├── page.tsx                     # 1️⃣ Landing
│   │   ├── sign-in/[[...sign-in]]/page.tsx
│   │   ├── sign-up/[[...sign-up]]/page.tsx
│   │   ├── dashboard/page.tsx           # ringkasan pelanggan (loyalty + booking terbaru)
│   │   ├── booking/
│   │   │   ├── page.tsx                 # 2️⃣ Booking flow (server)
│   │   │   └── booking-form.tsx         # client component (slot picker)
│   │   ├── riwayat/page.tsx             # 3️⃣ Riwayat
│   │   ├── admin/
│   │   │   ├── layout.tsx               # admin guard + sub-nav
│   │   │   ├── page.tsx                 # 4️⃣ Dashboard proaktif
│   │   │   ├── bookings/page.tsx        # 5️⃣ Booking management
│   │   │   ├── transactions/page.tsx
│   │   │   └── reminders/page.tsx
│   │   └── api/
│   │       ├── health/route.ts
│   │       ├── slots/route.ts
│   │       ├── bookings/route.ts
│   │       ├── bookings/[id]/cancel/route.ts
│   │       ├── transactions/route.ts          # admin only — finalize tx
│   │       ├── loyalty/redeem-quote/route.ts  # preview diskon
│   │       ├── admin/reminders/send/route.ts  # trigger WA manual
│   │       ├── cron/reminders/route.ts        # cron endpoint
│   │       └── webhooks/fonnte/route.ts       # delivery report
│   ├── components/
│   │   ├── site-header.tsx
│   │   └── ui/{button,card,badge,input,label,separator}.tsx
│   ├── lib/
│   │   ├── prisma.ts
│   │   ├── auth.ts                       # Clerk -> User (DB) sync
│   │   ├── utils.ts                      # cn, formatIDR, formatDateID, makeCode
│   │   ├── slots.ts                      # generator 45-mnt + cap harian
│   │   ├── bookings.ts                   # createBooking / cancelBooking
│   │   ├── transactions.ts               # finalizeTransaction
│   │   ├── loyalty.ts                    # earn/redeem/expire FIFO
│   │   ├── reminders.ts                  # processDueReminders
│   │   └── fonnte.ts                     # WA gateway client
│   └── middleware.ts                     # Clerk middleware (route matcher)
├── .env.example
├── eslint.config.mjs
├── next.config.ts
├── package.json
├── postcss.config.mjs
├── tsconfig.json
└── README.md
```

---

## 2) `prisma/schema.prisma`

Schema kanonik tersedia di [`prisma/schema.prisma`](../prisma/schema.prisma). Ringkas:

- **Branches** (`branches`) — `id, name, address, city, phone, mechanic_capacity, daily_capacity (=11)`
- **Services** (`services`) — `id, name, type (enum), price, estimatedMinutes`
  Seed mencakup `Servis Ringan Rp 35.000` & `Ganti Oli Rp 45.000` plus tune up, servis berat, dll.
- **Transactions** (`transactions`) — invoice, subtotal, redeemedPoints, total, earnedPoints
- **TransactionItems** (`transaction_items`) — line item per servis/sparepart
- **LoyaltyPoints** (`loyalty_points`) — saldo per user (1:1)
- **LoyaltyLedger** (`loyalty_ledger`) — entry EARN/REDEEM/ADJUST/EXPIRE; setiap EARN punya `expiresAt = createdAt + 12 bulan` dan `remaining` untuk FIFO
- **Bookings** (`bookings`) + **BookingService** (M:N services) + **MechanicSlot** + **ServiceReminder**
- **Users**, **Motorcycles**, **AuditLog**

Aturan bisnis tegak-lurus dengan kode `src/lib/loyalty.ts`, `src/lib/slots.ts`, `src/lib/bookings.ts`.

---

## 3) Desain arsitektur API endpoints

| Method | Path | Akses | Fungsi |
| --- | --- | --- | --- |
| `GET` | `/api/health` | Public | Health check |
| `GET` | `/api/slots?branchId&date` | Auth | Slot 45-mnt + remaining capacity |
| `POST` | `/api/bookings` | Auth | Buat booking (validasi slot + cap harian 11) |
| `GET` | `/api/bookings` | Auth | Riwayat booking pelanggan |
| `POST` | `/api/bookings/:id/cancel` | Auth | Cancel + return slot |
| `POST` | `/api/transactions` | Admin | Finalize: hitung earn + redeem + jadwal reminder |
| `GET` | `/api/loyalty/redeem-quote?points` | Public | Preview diskon dari poin |
| `POST` | `/api/admin/reminders/send` | Admin | Kirim WA manual (override jadwal) |
| `POST/GET` | `/api/cron/reminders` | `Bearer CRON_SECRET` | Trigger reminder + auto-expire poin |
| `POST` | `/api/webhooks/fonnte` | Public (HMAC opt) | Delivery report Fonnte |

Otentikasi: Clerk middleware (`src/middleware.ts`) memproteksi semua route `/dashboard`, `/booking`,
`/riwayat`, `/admin`, dan API equivalents. Endpoint cron pakai `Authorization: Bearer ${CRON_SECRET}`.

Standar response error: `{ "message": "...", "code": "...", "issues": [...] }` dengan HTTP status
yang sesuai (`400/401/403/404/409/500`).

---

## 4) Spesifikasi UI 5 halaman

Tema visual: **dashboard 2026 minimalis** — Tailwind v4 tokens oklch, radius 1rem, whitespace
generous, mobile-first (grid 1-col → sm 2-col → md 3-4-col), Shadcn/UI primitives di
`src/components/ui/*`.

### a. Landing — `/`
- Hero: badge spesialis Batam, headline ganda, dual CTA (Booking + Admin).
- Highlight 4 fitur: 45-menit slot, loyalty, reminder WA, cap harian.
- Daftar layanan favorit (4 servis termurah pakai harga IDR).
- 3 cabang (Batu Aji, Bengkong, Sagulung) dengan link booking pre-fill.
- Footer minimalis.

### b. Booking flow — `/booking`
- Form 1 layar: pilih cabang → tanggal → motor (pilih existing atau input plat baru) → layanan (multi-checkbox) → slot 45-mnt grid.
- Slot grid otomatis fetch `/api/slots`, indikasi sisa kapasitas.
- Estimasi total live di footer card; CTA disable kalau slot/layanan kosong.
- Error state inline (cap harian penuh → tampilkan pesan + suggest tanggal lain).

### c. Riwayat — `/riwayat`
- Stack card per booking: kode, status (badge tone), tanggal, motor, daftar layanan, estimasi, link invoice (jika DONE).
- Empty state dengan CTA ke booking.

### d. Admin Dashboard Proaktif — `/admin`
- 3 alert card di atas: cabang penuh, pelanggan overdue follow-up, reminder WA gagal.
- Strip 4 KPI: booking hari ini, pendapatan hari ini, transaksi paid, pending booking.
- Heatmap kapasitas per cabang (progress bar + badge tone hijau/oranye/merah).
- 2 panel: Pending konfirmasi & Pelanggan overdue (dengan CTA kirim WA).
- Semua data fresh (`dynamic = "force-dynamic"`).

### e. Admin Booking Management — `/admin/bookings`
- Filter status (PENDING/CONFIRMED/IN_PROGRESS/DONE/CANCELLED) + filter cabang.
- Tabel responsive (overflow-x-auto) berisi pelanggan, motor, jadwal, layanan, estimasi, status.
- Quick actions (cancel/finalize) bisa ditambahkan di iterasi berikutnya via API yang sudah ada.

Mobile-first: header sticky, sub-nav admin pakai `flex flex-wrap` agar wrap di layar kecil, semua
grid pakai breakpoint `sm:` dan `md:` saja.

---

## 5) GitHub Actions CI/CD

| Workflow | Trigger | Job |
| --- | --- | --- |
| `ci.yml` | Push & PR ke `main` | `npm ci` → `prisma generate` → `prisma validate` → `npm run lint` → `npm run typecheck` → `npm run build` |
| `cron-reminders.yml` | `cron: "5 2 * * *"` (≈ 09:05 WIB) + `workflow_dispatch` | `curl -X POST $APP_URL/api/cron/reminders` dengan `Bearer $CRON_SECRET` |

Untuk deploy ke Railway/Vercel, tambah step deploy setelah build (di luar scope scaffold awal).
