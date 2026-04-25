/* eslint-disable no-console */
import { PrismaClient, BookingStatus, ServiceType, UserRole } from "@prisma/client";
import { generateSlotWindows, SLOT_RULES } from "../src/lib/slots";
import { calculateEarnedPoints } from "../src/lib/loyalty";
import { makeCode } from "../src/lib/utils";

const prisma = new PrismaClient();

const BRANCHES = [
  {
    name: "Cabang Batu Aji",
    address: "Jl. Letjen Suprapto No. 88, Batu Aji",
    city: "Batam",
    phone: "+62 778 1234567",
    mechanic_capacity: 2,
  },
  {
    name: "Cabang Bengkong",
    address: "Jl. Bengkong Laut No. 12, Bengkong",
    city: "Batam",
    phone: "+62 778 2345678",
    mechanic_capacity: 3,
  },
  {
    name: "Cabang Sagulung",
    address: "Jl. Brigjen Katamso No. 45, Sagulung",
    city: "Batam",
    phone: "+62 778 3456789",
    mechanic_capacity: 2,
  },
];

const SERVICES = [
  { name: "Servis Ringan", type: ServiceType.LIGHT_SERVICE, price: 35_000, estimatedMinutes: 45 },
  { name: "Ganti Oli", type: ServiceType.OIL_CHANGE, price: 45_000, estimatedMinutes: 30 },
  { name: "Tune Up Injeksi", type: ServiceType.TUNE_UP, price: 95_000, estimatedMinutes: 60 },
  { name: "Servis Berat", type: ServiceType.HEAVY_SERVICE, price: 250_000, estimatedMinutes: 180 },
  { name: "Ganti Kampas Rem", type: ServiceType.OTHER, price: 75_000, estimatedMinutes: 45 },
  { name: "Pasang Ban Baru", type: ServiceType.TIRE, price: 50_000, estimatedMinutes: 45 },
  { name: "Cek Kelistrikan", type: ServiceType.ELECTRICAL, price: 65_000, estimatedMinutes: 60 },
];

const FIRST_NAMES = [
  "Budi", "Siti", "Andi", "Rina", "Dedi", "Lia", "Joko", "Maya",
  "Agus", "Tika", "Hendra", "Wulan", "Bayu", "Dewi", "Rian", "Citra",
  "Faisal", "Indah", "Yusuf", "Putri",
];
const LAST_NAMES = [
  "Saputra", "Hasan", "Pratama", "Anggraini", "Wahyudi", "Lestari",
  "Kurniawan", "Sari", "Suryadi", "Fitri", "Hidayat", "Maharani",
  "Setiawan", "Permata", "Iskandar", "Larasati", "Maulana", "Mardhiah",
  "Ramadhan", "Nugroho",
];
const BRANDS = ["Honda", "Yamaha", "Suzuki", "Kawasaki"];
const MODELS: Record<string, string[]> = {
  Honda: ["Vario 150", "BeAT", "PCX 160", "Scoopy"],
  Yamaha: ["NMAX", "Aerox 155", "Mio M3", "Lexi"],
  Suzuki: ["Address", "Nex II"],
  Kawasaki: ["Ninja 250", "W175"],
};

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

function randomPlate(i: number): string {
  return `BP ${String(1000 + i).padStart(4, "0")} ${String.fromCharCode(
    65 + (i % 26),
  )}${String.fromCharCode(65 + ((i + 7) % 26))}`;
}

async function main() {
  console.log("Reset existing seed data…");
  await prisma.$transaction([
    prisma.transactionItem.deleteMany(),
    prisma.serviceReminder.deleteMany(),
    prisma.transaction.deleteMany(),
    prisma.bookingService.deleteMany(),
    prisma.booking.deleteMany(),
    prisma.mechanicSlot.deleteMany(),
    prisma.loyaltyLedger.deleteMany(),
    prisma.loyaltyPoint.deleteMany(),
    prisma.motorcycle.deleteMany(),
    prisma.user.deleteMany(),
    prisma.service.deleteMany(),
    prisma.branch.deleteMany(),
  ]);

  console.log("Seed branches…");
  const branches = await Promise.all(
    BRANCHES.map((b) =>
      prisma.branch.create({
        data: { ...b, daily_capacity: SLOT_RULES.DAILY_BOOKING_CAP },
      }),
    ),
  );

  console.log("Seed services…");
  const services = await Promise.all(
    SERVICES.map((s) => prisma.service.create({ data: s })),
  );

  console.log("Seed users (20 dummy + 1 admin)…");
  const admin = await prisma.user.create({
    data: {
      clerkId: "seed-admin-001",
      email: "admin@dasbor-bengkel.test",
      phone: "+6281200000001",
      fullName: "Admin Dasbor Bengkel",
      role: UserRole.ADMIN,
      branchId: branches[0].id,
    },
  });

  const customers = [];
  for (let i = 0; i < 20; i++) {
    const fullName = `${pick(FIRST_NAMES, i)} ${pick(LAST_NAMES, i + 3)}`;
    const user = await prisma.user.create({
      data: {
        clerkId: `seed-cust-${String(i).padStart(3, "0")}`,
        email: `customer${i + 1}@dasbor-bengkel.test`,
        phone: `+62812${String(10000000 + i).padStart(8, "0")}`,
        fullName,
        role: UserRole.CUSTOMER,
      },
    });
    customers.push(user);

    const brand = pick(BRANDS, i);
    const model = pick(MODELS[brand], i);
    await prisma.motorcycle.create({
      data: {
        ownerId: user.id,
        plateNumber: randomPlate(i),
        brand,
        model,
        year: 2018 + (i % 7),
        color: pick(["Hitam", "Merah", "Putih", "Biru", "Abu"], i),
      },
    });
  }

  console.log("Materialize mechanic slots untuk 10 hari ke depan…");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let day = 0; day < 10; day++) {
    const date = new Date(today);
    date.setDate(date.getDate() + day);
    for (const branch of branches) {
      const windows = generateSlotWindows(date);
      await prisma.mechanicSlot.createMany({
        data: windows.map((w) => ({
          branchId: branch.id,
          slotDate: date,
          startTime: w.start,
          endTime: w.end,
          capacity: branch.mechanic_capacity,
          booked: 0,
        })),
        skipDuplicates: true,
      });
    }
  }

  console.log("Seed 50 bookings…");
  const statusPool: BookingStatus[] = [
    BookingStatus.PENDING,
    BookingStatus.PENDING,
    BookingStatus.CONFIRMED,
    BookingStatus.CONFIRMED,
    BookingStatus.DONE,
    BookingStatus.DONE,
    BookingStatus.DONE,
    BookingStatus.CANCELLED,
  ];

  let bookingSeq = 0;
  for (let i = 0; i < 50; i++) {
    const customer = customers[i % customers.length];
    const moto = await prisma.motorcycle.findFirst({ where: { ownerId: customer.id } });
    if (!moto) continue;
    const branch = pick(branches, i);
    const dayOffset = (i % 14) - 7; // -7..+6 (mix past/future)
    const date = new Date(today);
    date.setDate(date.getDate() + dayOffset);
    // ensure slots for past days too (DONE bookings)
    const windows = generateSlotWindows(date);
    if (windows.length === 0) continue;

    await prisma.mechanicSlot.createMany({
      data: windows.map((w) => ({
        branchId: branch.id,
        slotDate: date,
        startTime: w.start,
        endTime: w.end,
        capacity: branch.mechanic_capacity,
        booked: 0,
      })),
      skipDuplicates: true,
    });

    const slot = await prisma.mechanicSlot.findFirst({
      where: { branchId: branch.id, slotDate: date, booked: { lt: branch.mechanic_capacity } },
      orderBy: { startTime: "asc" },
    });
    if (!slot) continue;

    const chosen = [pick(services, i), pick(services, i + 3)];
    const estimatedTotal = chosen.reduce((acc, s) => acc + s.price, 0);
    const status = pick(statusPool, i);
    bookingSeq += 1;
    const code = makeCode("BK", bookingSeq, date);

    const booking = await prisma.booking.create({
      data: {
        code,
        customerId: customer.id,
        motorcycleId: moto.id,
        branchId: branch.id,
        slotId: slot.id,
        scheduledAt: slot.startTime,
        status,
        estimatedTotal,
        doneAt:
          status === BookingStatus.DONE
            ? new Date(slot.startTime.getTime() + 90 * 60_000)
            : null,
        cancelledAt: status === BookingStatus.CANCELLED ? new Date() : null,
        notes:
          status === BookingStatus.CANCELLED
            ? "Pelanggan reschedule via WA"
            : null,
        services: {
          create: chosen.map((s) => ({
            serviceId: s.id,
            priceSnapshot: s.price,
          })),
        },
      },
    });

    await prisma.mechanicSlot.update({
      where: { id: slot.id },
      data: { booked: { increment: 1 } },
    });

    // Buat transaksi + loyalty entry untuk booking DONE
    if (status === BookingStatus.DONE) {
      const subtotal = estimatedTotal;
      const earnedPoints = calculateEarnedPoints(subtotal);
      const txDate = booking.doneAt ?? new Date();
      const tx = await prisma.transaction.create({
        data: {
          invoiceNumber: makeCode("INV", bookingSeq, txDate),
          bookingId: booking.id,
          customerId: customer.id,
          branchId: branch.id,
          status: "PAID",
          subtotal,
          discountAmount: 0,
          redeemedPoints: 0,
          total: subtotal,
          earnedPoints,
          paymentMethod: pick(["CASH", "QRIS", "DEBIT"], i),
          paidAt: txDate,
          items: {
            create: chosen.map((s) => ({
              serviceId: s.id,
              description: s.name,
              unitPrice: s.price,
              quantity: 1,
              lineTotal: s.price,
            })),
          },
        },
      });

      const expiresAt = new Date(txDate);
      expiresAt.setMonth(expiresAt.getMonth() + 12);
      await prisma.loyaltyLedger.create({
        data: {
          userId: customer.id,
          transactionId: tx.id,
          type: "EARN",
          points: earnedPoints,
          remaining: earnedPoints,
          expiresAt,
          note: `Earn dari ${tx.invoiceNumber}`,
        },
      });
      await prisma.loyaltyPoint.upsert({
        where: { userId: customer.id },
        create: {
          userId: customer.id,
          balance: earnedPoints,
          lifetimeEarned: earnedPoints,
        },
        update: {
          balance: { increment: earnedPoints },
          lifetimeEarned: { increment: earnedPoints },
        },
      });

      const remindAt = new Date(txDate);
      remindAt.setDate(remindAt.getDate() + 50);
      await prisma.serviceReminder.create({
        data: {
          userId: customer.id,
          bookingId: booking.id,
          scheduledFor: remindAt,
          status: remindAt < new Date() ? "SCHEDULED" : "SCHEDULED",
          message: `Reminder servis 50 hari setelah ${tx.invoiceNumber}`,
        },
      });
    }
  }

  console.log("Seed selesai ✔ ");
  console.log({
    branches: branches.length,
    services: services.length,
    customers: customers.length,
    admin: admin.email,
    bookings: 50,
  });
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
