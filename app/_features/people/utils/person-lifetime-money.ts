import type { Invoice, RelationshipType } from "@/app/_lib/demo/people-demo-data";

export type PersonMoneyFlow = "receivable" | "payable" | "none";

export function getPersonMoneyFlow(relationship: RelationshipType): PersonMoneyFlow {
  switch (relationship) {
    case "Client":
    case "Past client":
    case "Prospect":
      return "receivable";
    case "Vendor":
    case "Partner":
      return "payable";
    default:
      return "none";
  }
}

export function getPersonLifetimeMoneyLabel(flow: PersonMoneyFlow): string {
  switch (flow) {
    case "receivable":
      return "Lifetime revenue";
    case "payable":
      return "Total paid";
    default:
      return "Lifetime value";
  }
}

export function sumPaidInvoiceCents(invoices: Invoice[]): number {
  return invoices
    .filter((invoice) => invoice.status === "paid")
    .reduce((sum, invoice) => sum + invoice.amountCents, 0);
}

export function sumPaidPayableCents(
  rows: { amount_paid_cents: number | null; amount_cents: number; status: string }[],
): number {
  return rows.reduce((sum, row) => {
    const paid = row.amount_paid_cents ?? 0;
    if (row.status === "paid") {
      return sum + Math.abs(paid || row.amount_cents);
    }
    return sum + Math.abs(paid);
  }, 0);
}

export function resolvePersonLifetimeMoneyCents(input: {
  flow: PersonMoneyFlow;
  lifetimeRevenueCents?: number | null;
  totalPaidCents?: number | null;
  invoices?: Invoice[];
}): number | null {
  if (input.flow === "receivable") {
    if (input.lifetimeRevenueCents != null && input.lifetimeRevenueCents > 0) {
      return input.lifetimeRevenueCents;
    }
    if (input.invoices?.length) {
      const total = sumPaidInvoiceCents(input.invoices);
      return total > 0 ? total : null;
    }
    return input.lifetimeRevenueCents ?? null;
  }

  if (input.flow === "payable") {
    if (input.totalPaidCents != null && input.totalPaidCents > 0) {
      return input.totalPaidCents;
    }
    return input.totalPaidCents ?? null;
  }

  return null;
}
