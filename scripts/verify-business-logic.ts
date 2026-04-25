/**
 * Ad-hoc verification of business-logic helpers against the spec.
 * Run with: npx tsx scripts/verify-business-logic.ts
 */
import { generateSlotWindows, SLOT_RULES } from "../src/lib/slots";
import {
  calculateEarnedPoints,
  calculateRedeemDiscount,
  LOYALTY_RULES,
  pointsExpiryDate,
} from "../src/lib/loyalty";

type Check = { name: string; pass: boolean; want: unknown; got: unknown };
const results: Check[] = [];
function expect(name: string, got: unknown, want: unknown) {
  const pass = JSON.stringify(got) === JSON.stringify(want);
  results.push({ name, pass, want, got });
}

// --- Slots ---
const day = new Date("2026-05-01T00:00:00+07:00");
const windows = generateSlotWindows(day);
const hhmm = (d: Date) =>
  `${d.getHours().toString().padStart(2, "0")}:${d
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;

const startTimes = windows.map((w) => hhmm(w.start));
const endTimes = windows.map((w) => hhmm(w.end));

expect("slot count per day = 10", windows.length, 10);
expect("first slot starts at 09:00", startTimes[0], "09:00");
expect(
  "no slot starts during lunch 12:00-13:00",
  startTimes.some((t) => t >= "12:00" && t < "13:00"),
  false,
);
expect(
  "slots resume at 13:00 after lunch",
  startTimes.includes("13:00"),
  true,
);
expect(
  "no slot ends after 18:00",
  endTimes.every((t) => t <= "18:00"),
  true,
);
expect("interval = 45 minutes", SLOT_RULES.INTERVAL_MINUTES, 45);
expect("daily cap = 11", SLOT_RULES.DAILY_BOOKING_CAP, 11);

// Exact schedule:
expect(
  "exact start times",
  startTimes,
  [
    "09:00",
    "09:45",
    "10:30",
    "11:15",
    "13:00",
    "13:45",
    "14:30",
    "15:15",
    "16:00",
    "16:45",
  ],
);

// --- Loyalty ---
expect("earn: Rp 25.000 => 20 pts", calculateEarnedPoints(25_000), 20);
expect("earn: Rp 9.999 => 0 pts", calculateEarnedPoints(9_999), 0);
expect("earn: Rp 100.000 => 100 pts", calculateEarnedPoints(100_000), 100);
expect(
  "earn: Rp 35.000 (Servis Ringan) => 30 pts",
  calculateEarnedPoints(35_000),
  30,
);
expect(
  "earn: Rp 45.000 (Ganti Oli) => 40 pts",
  calculateEarnedPoints(45_000),
  40,
);

expect(
  "redeem: 75 pts => {0, Rp0}",
  calculateRedeemDiscount(75),
  { validPoints: 0, discount: 0 },
);
expect(
  "redeem: 100 pts => {100, Rp10.000}",
  calculateRedeemDiscount(100),
  { validPoints: 100, discount: 10_000 },
);
expect(
  "redeem: 150 pts => rounded down to {100, Rp10.000}",
  calculateRedeemDiscount(150),
  { validPoints: 100, discount: 10_000 },
);
expect(
  "redeem: 250 pts => {200, Rp20.000}",
  calculateRedeemDiscount(250),
  { validPoints: 200, discount: 20_000 },
);

expect("LOYALTY_RULES.EARN_PER_RUPIAH", LOYALTY_RULES.EARN_PER_RUPIAH, 10_000);
expect("LOYALTY_RULES.EARN_POINTS", LOYALTY_RULES.EARN_POINTS, 10);
expect("LOYALTY_RULES.REDEEM_MIN_POINTS", LOYALTY_RULES.REDEEM_MIN_POINTS, 100);
expect("LOYALTY_RULES.EXPIRY_MONTHS", LOYALTY_RULES.EXPIRY_MONTHS, 12);

// Expiry date: 12 months from a known instant
const from = new Date("2026-01-15T00:00:00Z");
const exp = pointsExpiryDate(from);
expect(
  "expiry = +12 months",
  exp.toISOString().slice(0, 10),
  "2027-01-15",
);

// --- Report ---
let failed = 0;
for (const r of results) {
  const prefix = r.pass ? "PASS" : "FAIL";
  if (!r.pass) failed += 1;
  // eslint-disable-next-line no-console
  console.log(
    `${prefix}  ${r.name}` +
      (r.pass ? "" : `\n      want=${JSON.stringify(r.want)}\n      got=${JSON.stringify(r.got)}`),
  );
}
// eslint-disable-next-line no-console
console.log(`\n${results.length - failed}/${results.length} checks passed`);
if (failed > 0) process.exit(1);
