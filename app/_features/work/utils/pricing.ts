export type WorkDiscountInput =
  | { type: "percent"; percent: number | null; amountCents?: null }
  | { type: "amount"; amountCents: number | null; percent?: null };

function clampMoney(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
}

export function computeFinalPrice(baseCents: number | null, discount: WorkDiscountInput): number | null {
  if (baseCents == null) return null;

  const base = clampMoney(baseCents);
  if (discount.type === "percent") {
    const percent = Math.min(100, Math.max(0, discount.percent ?? 0));
    return clampMoney(base * (1 - percent / 100));
  }

  const amount = clampMoney(discount.amountCents ?? 0);
  return clampMoney(base - amount);
}

export function formatCurrencyCents(value: number | null, currency = "USD"): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value / 100);
}
