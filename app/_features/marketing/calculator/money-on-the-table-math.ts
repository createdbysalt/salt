export const CLOSE_RATE = 0.25;
export const REVIVE_RATE = 0.2;
export const ADMIN_AUTOMATABLE = 0.55;
export const WORK_WEEKS = 48;
export const HOURS_DENOM = 1500;
export const RANGE = 0.3;
export const REVENUE_CAP = 0.4;
export const HB_FEE_PCT = 0.029;
export const HB_FEE_FLAT = 0.3;

export const HB_TIER_NAMES: Record<string, string> = {
  "36": "Starter",
  "59": "Essentials",
  "129": "Premium",
};

export type CalculatorSegment =
  | "creative"
  | "coach"
  | "consultant"
  | "realestate"
  | "advisor"
  | "wellness"
  | "wedding"
  | "other";

export type CalculatorInputs = {
  segment: CalculatorSegment;
  revenue: number;
  inquiries: number;
  dealValue: number;
  lossRate: number;
  ghosted: number;
  adminHours: number;
  honeybook: boolean;
  hbTier: number;
  hbBookings: number;
  hbBookingValue: number;
};

export type CalculatorLeak = {
  icon: string;
  name: string;
  amount: number;
  why: string;
  mathDetail: string;
};

export type CalculatorMathLine = {
  label: string;
  detail: string;
};

export type HoneybookCost = {
  tierName: string;
  subscription: number;
  fees: number;
  manualAdmin: number;
  total: number;
  bookings: number;
  bookingValue: number;
};

export type CalculatorResult = {
  total: number;
  capped: boolean;
  rangeLow: number;
  rangeHigh: number;
  hourly: number;
  leaks: CalculatorLeak[];
  mathLines: CalculatorMathLine[];
  honeybook?: HoneybookCost;
};

export function formatMoney(n: number): string {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

export function formatMoneyRounded(n: number): string {
  if (n >= 10000) {
    const rounded = Math.round(n / 500) * 500;
    return `$${rounded.toLocaleString("en-US")}`;
  }
  return formatMoney(n);
}

export function formatMoneyRange(lo: number, hi: number): string {
  return `${formatMoneyRounded(lo)} – ${formatMoneyRounded(hi)}`;
}

export function calculateMoneyOnTheTable(
  inputs: CalculatorInputs
): CalculatorResult {
  const {
    revenue,
    inquiries,
    dealValue,
    lossRate,
    ghosted,
    adminHours,
    honeybook,
    hbTier,
    hbBookings,
    hbBookingValue,
  } = inputs;

  const hourly = revenue / HOURS_DENOM;

  const leakInquiry = inquiries * 12 * lossRate * CLOSE_RATE * dealValue;
  const leakGhosted = ghosted * 4 * REVIVE_RATE * dealValue;
  const leakAdmin = adminHours * WORK_WEEKS * hourly * ADMIN_AUTOMATABLE;

  let total = leakInquiry + leakGhosted + leakAdmin;
  let capped = false;
  if (total > revenue * REVENUE_CAP) {
    total = revenue * REVENUE_CAP;
    capped = true;
  }

  const rangeLow = total * (1 - RANGE);
  const rangeHigh = total * (1 + RANGE);

  const leaks: CalculatorLeak[] = [
    {
      icon: "⏱",
      name: "Inquiries that went cold",
      amount: leakInquiry,
      why: "Solo service businesses commonly lose 30%+ of inquiries to slow replies. Leads decide while they wait.",
      mathDetail: `${inquiries} inquiries/mo × 12 months × ${Math.round(lossRate * 100)}% lost at your reply speed × ${Math.round(CLOSE_RATE * 100)}% close rate × ${formatMoney(dealValue)} average deal value.`,
    },
    {
      icon: "📨",
      name: "Proposals nobody followed up on",
      amount: leakGhosted,
      why: "A structured follow-up sequence typically revives about 1 in 5 silent proposals. Silence is rarely a no.",
      mathDetail: `${ghosted} silent proposals in the last 3 months × 4 (annualized) × ${Math.round(REVIVE_RATE * 100)}% revived by consistent follow-up × ${formatMoney(dealValue)} average deal value.`,
    },
    {
      icon: "🗂",
      name: "Admin hours at your hourly value",
      amount: leakAdmin,
      why: "Most inbox, scheduling, invoicing, and follow-up work in a solo business is routine — the kind of work that runs without you.",
      mathDetail: `${adminHours} hrs/week × ${WORK_WEEKS} working weeks × ${formatMoney(hourly)}/hr (your revenue ÷ ${HOURS_DENOM.toLocaleString("en-US")} working hours) × ${Math.round(ADMIN_AUTOMATABLE * 100)}% of admin that is routine.`,
    },
  ].sort((a, b) => b.amount - a.amount);

  let honeybookCost: HoneybookCost | undefined;
  if (honeybook) {
    const tierKey = String(hbTier);
    const subscription = hbTier * 12;
    const fees =
      hbBookings * hbBookingValue * HB_FEE_PCT + hbBookings * HB_FEE_FLAT;
    honeybookCost = {
      tierName: HB_TIER_NAMES[tierKey] ?? "Essentials",
      subscription,
      fees,
      manualAdmin: leakAdmin,
      total: subscription + fees + leakAdmin,
      bookings: hbBookings,
      bookingValue: hbBookingValue,
    };
  }

  const mathLines: CalculatorMathLine[] = [
    {
      label: "Inquiries that went cold: ",
      detail: `${inquiries} inquiries/mo × 12 × ${Math.round(lossRate * 100)}% lost at your reply speed × ${Math.round(CLOSE_RATE * 100)}% close rate × ${formatMoney(dealValue)} average value.`,
    },
    {
      label: "Silent proposals: ",
      detail: `${ghosted} in the last 3 months ×4 (annualized) × ${Math.round(REVIVE_RATE * 100)}% revived by consistent follow-up × ${formatMoney(dealValue)}.`,
    },
    {
      label: "Admin hours: ",
      detail: `${adminHours} hrs/wk × ${WORK_WEEKS} weeks × ${formatMoney(hourly)}/hr (your revenue ÷ ${HOURS_DENOM.toLocaleString()} working hours) × ${Math.round(ADMIN_AUTOMATABLE * 100)}% of admin that is routine.`,
    },
    {
      label: "The range: ",
      detail: `±${Math.round(RANGE * 100)}% on the sum, because benchmarks are not your books.${capped ? ` We also capped the estimate at ${Math.round(REVENUE_CAP * 100)}% of your stated revenue to stay honest.` : ""}`,
    },
    {
      label: "Benchmarks behind the assumptions: ",
      detail:
        "85% of independent professionals experience late payments (39-day average wait); businesses commonly lose 30%+ of inquiries to slow replies; 72% of projects suffer scope creep. Industry research, sources on request.",
    },
  ];

  if (honeybook && honeybookCost) {
    mathLines.push({
      label: "HoneyBook real cost: ",
      detail: `subscription ${formatMoney(honeybookCost.subscription)}/yr + processing fees (${hbBookings} bookings × ${formatMoney(hbBookingValue)} × 2.9%, plus $0.30 per transaction) + your admin hours valued above. Shown as its own card and not added to the money-on-the-table total, since the admin line is already counted there.`,
    });
  }

  return {
    total,
    capped,
    rangeLow,
    rangeHigh,
    hourly,
    leaks,
    mathLines,
    honeybook: honeybookCost,
  };
}
