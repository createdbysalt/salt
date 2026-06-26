import {
  formatBillingMoney,
  type BillingDirection,
  type BillingStatus,
} from "../data";

export type PaymentSidebarTone = "settled" | "urgent" | "draft" | "watch";

export type PaymentSidebarDisplay = {
  heroLabel: string;
  heroAmount: string;
  heroSubtitle: string;
  tone: PaymentSidebarTone;
  showWorthAttention: boolean;
  isSettled: boolean;
};

function dueCountdownFromDate(dueAt: string, now: Date): string {
  const due = new Date(dueAt);
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays > 0) return `Due in ${diffDays}d`;
  if (diffDays === 0) return "Due today";
  return `${Math.abs(diffDays)}d overdue`;
}

export function dueCountdownLabel(input: {
  dueAt: string;
  status: BillingStatus;
  direction: BillingDirection;
  now?: Date;
}): string {
  const now = input.now ?? new Date();

  if (input.status === "paid" || input.status === "refunded") {
    return "Settled";
  }

  if (input.status === "draft") {
    return input.direction === "receivable" ? "Invoice draft" : "Payable draft";
  }

  return dueCountdownFromDate(input.dueAt, now);
}

export function resolvePaymentSidebarDisplay(input: {
  direction: BillingDirection;
  status: BillingStatus;
  balanceCents: number;
  amountCents: number;
  currency: string;
  dueAt: string;
  amountFormatted: string;
  amountPaidFormatted: string;
  balanceFormatted: string;
  worthAttention?: { reason: string; suggestedPlay?: string };
  now?: Date;
}): PaymentSidebarDisplay {
  const now = input.now ?? new Date();
  const isSettled =
    input.balanceCents <= 0 ||
    input.status === "paid" ||
    input.status === "refunded";

  if (isSettled) {
    return {
      heroLabel: "Settled",
      heroAmount: input.amountPaidFormatted || input.amountFormatted,
      heroSubtitle:
        input.direction === "receivable" ? "Payment received" : "Paid in full",
      tone: "settled",
      showWorthAttention: false,
      isSettled: true,
    };
  }

  if (input.status === "draft") {
    return {
      heroLabel:
        input.direction === "receivable" ? "Invoice draft" : "Payable draft",
      heroAmount: input.amountFormatted,
      heroSubtitle: "Review before tracking payment",
      tone: "draft",
      showWorthAttention: Boolean(input.worthAttention),
      isSettled: false,
    };
  }

  const countdown = dueCountdownFromDate(input.dueAt, now);
  const isOverdue = input.status === "overdue" || countdown.includes("overdue");

  return {
    heroLabel: countdown,
    heroAmount: input.balanceFormatted,
    heroSubtitle: input.direction === "receivable" ? "Outstanding" : "To pay",
    tone: isOverdue ? "urgent" : "watch",
    showWorthAttention: Boolean(input.worthAttention),
    isSettled: false,
  };
}

export function buildPaymentStatusReasons(input: {
  direction: BillingDirection;
  status: BillingStatus;
  balanceCents: number;
  currency: string;
  dueAt: string;
  now?: Date;
}): Array<{ label: string; detail: string; tone: "warning" | "neutral" | "success" }> {
  const reasons: Array<{ label: string; detail: string; tone: "warning" | "neutral" | "success" }> =
    [];
  const now = input.now ?? new Date();

  if (input.status === "draft") {
    reasons.push({
      label: input.direction === "receivable" ? "Invoice draft" : "Payable draft",
      detail: "Confirm details before tracking payment status",
      tone: "neutral",
    });
    return reasons;
  }

  if (input.status === "due" || input.status === "overdue") {
    reasons.push({
      label: input.status === "overdue" ? "Past due" : "Due soon",
      detail: dueCountdownFromDate(input.dueAt, now),
      tone: "warning",
    });
  }

  if (input.balanceCents > 0) {
    reasons.push({
      label: input.direction === "receivable" ? "Awaiting payment" : "Outstanding",
      detail: `${formatBillingMoney(input.balanceCents, input.currency)} unpaid`,
      tone: "warning",
    });
  } else if (input.status === "paid") {
    reasons.push({
      label: "Settled",
      detail:
        input.direction === "receivable"
          ? "Payment received in full"
          : "Paid in full",
      tone: "success",
    });
  }

  return reasons;
}

export function markPaidActionLabel(direction: BillingDirection): string {
  return direction === "receivable" ? "Mark received" : "Mark paid";
}

export function alreadyPaidIntakeLabel(direction: BillingDirection): string {
  return direction === "receivable"
    ? "Payment already received"
    : "Already paid (receipt)";
}
