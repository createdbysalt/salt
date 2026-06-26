import type { Connection } from "@/app/_lib/demo/people-demo-data";
import {
  BILLING_STATUS_LABEL,
  PAYABLE_CATEGORY_LABEL,
  formatBillingMoney,
  relativeDays,
  type BillingRecord,
  type BillingStatus,
} from "../data";
import type { BillingDetailLinks, BillingDetailViewModel, BillingStatusReason } from "../detail-types";
import { getBillingProviderDisplay } from "./provider-display";
import {
  buildPaymentStatusReasons,
  dueCountdownLabel,
  resolvePaymentSidebarDisplay,
} from "./payment-display";

export const BILLING_STATUS_TONE: Record<BillingStatus, string> = {
  paid: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  due: "bg-flame/10 text-flame border-flame/30",
  overdue: "bg-destructive/10 text-destructive border-destructive/30",
  draft: "bg-muted text-muted-foreground border-border/60",
  partial: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
  refunded: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30",
  disputed: "bg-destructive/10 text-destructive border-destructive/30",
};

function sourceLabel(record: BillingRecord): string {
  if (record.origin === "added") return "Added by user";
  return `Found in ${getBillingProviderDisplay(record.provider).label}`;
}

function originLabel(record: BillingRecord): string {
  return record.origin === "found" ? "Found by Salt" : "Added to Salt";
}

function party(record: BillingRecord): { label: string; subtitle?: string } {
  if (record.direction === "receivable") {
    return {
      label: record.org?.name ?? record.billTo?.name ?? "Unmatched customer",
      subtitle: record.billTo?.name && record.org?.name ? record.billTo.name : record.billTo?.subtitle,
    };
  }

  return {
    label: record.vendorLabel ?? record.payTo?.name ?? "Unmatched vendor",
    subtitle: record.payTo?.subtitle,
  };
}

function connections(record: BillingRecord): Connection[] {
  const items: Connection[] = [];

  if (record.org) {
    items.push({ id: record.org.id, name: record.org.name, type: "org" });
  }

  if (record.billTo) {
    items.push({
      id: record.billTo.id,
      name: record.billTo.name,
      type: "person",
      subtitle: record.billTo.subtitle,
    });
  }

  if (record.payTo) {
    items.push({
      id: record.payTo.id,
      name: record.payTo.name,
      type: "person",
      subtitle: record.payTo.subtitle,
    });
  }

  if (record.work) {
    items.push({ id: record.work.id, name: record.work.title, type: "work" });
  }

  return items;
}

function recurrenceLabel(record: BillingRecord): string | undefined {
  if (!record.recurrence) return undefined;
  const next = record.recurrence.nextAt ? ` · next ${relativeDays(record.recurrence.nextAt)}` : "";
  return `Recurring ${record.recurrence.cadence}${next}`;
}

function dueCountdownLabelForRecord(record: BillingRecord): string {
  return dueCountdownLabel({
    dueAt: record.dueAt,
    status: record.status,
    direction: record.direction,
  });
}

function statusReasons(record: BillingRecord, balanceCents: number): BillingStatusReason[] {
  const reasons = buildPaymentStatusReasons({
    direction: record.direction,
    status: record.status,
    balanceCents,
    currency: record.currency,
    dueAt: record.dueAt,
  });

  if (record.duplicateOf) {
    reasons.push({
      label: "Possible duplicate",
      detail: "Review before sending or paying",
      tone: "warning",
    });
  }

  return reasons;
}

function orgContext(record: BillingRecord): { retainerTier?: string; mrr?: string } {
  return {
    retainerTier: record.retainerTier,
    mrr: record.mrrCents ? formatBillingMoney(record.mrrCents, record.currency) : undefined,
  };
}

export function buildBillingSummary(record: BillingRecord, balanceCents: number): string {
  const partyInfo = party(record);
  const amount = formatBillingMoney(record.amountCents, record.currency);
  const balance = formatBillingMoney(balanceCents, record.currency);
  const workPhrase = record.work ? ` for ${record.work.title}` : "";

  if (record.direction === "receivable") {
    const statusPhrase =
      record.status === "paid"
        ? "is paid in full"
        : record.status === "overdue"
          ? "is overdue"
          : record.status === "partial"
            ? "is partially paid"
            : "is open";

    const outstandingPhrase =
      balanceCents > 0 ? ` ${balance} outstanding.` : "";

    return `${amount} invoice ${record.number} for ${partyInfo.label}${workPhrase} ${statusPhrase}.${outstandingPhrase}`.trim();
  }

  const categoryPhrase = record.category
    ? ` (${PAYABLE_CATEGORY_LABEL[record.category]})`
    : "";
  const reviewPhrase =
    record.extraction?.needsReview.length
      ? " Salt extracted this from a document — review the highlighted fields before paying."
      : "";

  const statusPhrase =
    record.status === "paid"
      ? "has been paid"
      : record.status === "draft"
        ? "is still a draft"
        : "is ready to pay";

  return `${amount} bill ${record.number} from ${partyInfo.label}${categoryPhrase}${workPhrase} ${statusPhrase}.${reviewPhrase}`.trim();
}

export function toBillingDetailViewModel(
  record: BillingRecord,
  links: BillingDetailLinks = {},
): BillingDetailViewModel {
  const display = getBillingProviderDisplay(record.provider);
  const paidCents = record.amountPaidCents ?? (record.status === "paid" ? record.amountCents : 0);
  const balanceCents = record.amountCents - paidCents;
  const partyInfo = party(record);
  const providerLabel = display.label;
  const orgInfo = orgContext(record);
  const countdown = dueCountdownLabelForRecord(record);
  const paymentSidebar = resolvePaymentSidebarDisplay({
    direction: record.direction,
    status: record.status,
    balanceCents,
    amountCents: record.amountCents,
    currency: record.currency,
    dueAt: record.dueAt,
    amountFormatted: formatBillingMoney(record.amountCents, record.currency),
    amountPaidFormatted: formatBillingMoney(paidCents, record.currency),
    balanceFormatted: formatBillingMoney(balanceCents, record.currency),
    worthAttention: record.worthAttention,
  });

  return {
    id: record.id,
    direction: record.direction,
    directionLabel: record.direction === "receivable" ? "Client invoice" : "Vendor bill",
    title: record.direction === "receivable" ? "Invoice" : "Payable",
    number: record.number,
    provider: record.provider,
    providerDisplay: display,
    sourceLabel: sourceLabel(record),
    originLabel: originLabel(record),
    source: record.source,
    sourceExternalId: record.sourceExternalId,
    amount: formatBillingMoney(record.amountCents, record.currency),
    amountPaid: formatBillingMoney(paidCents, record.currency),
    balance: formatBillingMoney(balanceCents, record.currency),
    balanceCents,
    currency: record.currency.toUpperCase(),
    status: record.status,
    statusLabel: BILLING_STATUS_LABEL[record.status],
    statusTone: BILLING_STATUS_TONE[record.status],
    dueLabel: record.status === "due" || record.status === "overdue" ? `Due ${relativeDays(record.dueAt)}` : relativeDays(record.dueAt),
    dueCountdownLabel: countdown,
    issuedLabel: `Issued ${relativeDays(record.issuedAt)}`,
    issuedRelativeLabel: relativeDays(record.issuedAt),
    paidLabel: record.paidAt ? `Paid ${relativeDays(record.paidAt)}` : undefined,
    appUrl: record.appUrl,
    appActionLabel: record.appUrl ? `Open in ${providerLabel}` : `Reconnect ${providerLabel}`,
    partyLabel: partyInfo.label,
    partySubtitle: partyInfo.subtitle,
    work: record.work,
    categoryLabel: record.category ? PAYABLE_CATEGORY_LABEL[record.category] : undefined,
    lineItems: record.lineItems.map((item) => ({
      description: item.description,
      amount: formatBillingMoney(item.amountCents, record.currency),
    })),
    activity: record.activity,
    connections: connections(record),
    tags: record.tags,
    metrics: [
      { label: "Issued", value: relativeDays(record.issuedAt) },
      { label: "Outstanding", value: formatBillingMoney(balanceCents, record.currency) },
      ...(orgInfo.retainerTier ? [{ label: "Retainer tier", value: orgInfo.retainerTier }] : []),
      ...(orgInfo.mrr ? [{ label: "MRR", value: orgInfo.mrr }] : []),
    ],
    worthAttention: record.worthAttention,
    statusReasons: statusReasons(record, balanceCents),
    retainerTier: orgInfo.retainerTier,
    mrr: orgInfo.mrr,
    recurrenceLabel: recurrenceLabel(record),
    extraction: record.extraction,
    duplicateOf: record.duplicateOf,
    summary: buildBillingSummary(record, balanceCents),
    paymentFlowLabel: record.direction === "receivable" ? "Money in" : "Money out",
    paymentSidebar,
    captureSourceUrl: links.captureSourceUrl,
    documentUrl: links.documentUrl,
    updatedAt: links.updatedAt,
  };
}
