/**
 * Aturan loyalty pure (tanpa Prisma) — aman diimpor dari komponen client.
 */
export const LOYALTY_RULES = {
  EARN_PER_RUPIAH: 10_000,
  EARN_POINTS: 10,
  REDEEM_MIN_POINTS: 100,
  REDEEM_STEP: 100,
  REDEEM_VALUE_PER_STEP: 10_000,
  EXPIRY_MONTHS: 12,
} as const;

export function calculateEarnedPoints(subtotalRupiah: number): number {
  if (subtotalRupiah <= 0) return 0;
  const multiples = Math.floor(subtotalRupiah / LOYALTY_RULES.EARN_PER_RUPIAH);
  return multiples * LOYALTY_RULES.EARN_POINTS;
}

export function calculateRedeemDiscount(pointsToRedeem: number): {
  validPoints: number;
  discount: number;
} {
  if (pointsToRedeem < LOYALTY_RULES.REDEEM_MIN_POINTS) {
    return { validPoints: 0, discount: 0 };
  }
  const validPoints =
    Math.floor(pointsToRedeem / LOYALTY_RULES.REDEEM_STEP) *
    LOYALTY_RULES.REDEEM_STEP;
  const discount =
    (validPoints / LOYALTY_RULES.REDEEM_STEP) *
    LOYALTY_RULES.REDEEM_VALUE_PER_STEP;
  return { validPoints, discount };
}
