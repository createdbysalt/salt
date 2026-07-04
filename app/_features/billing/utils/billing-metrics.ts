import type { BillingDirection, BillingRecord } from "../data";
import { formatBillingMoney } from "../data";

const UNPAID_STATUSES = new Set(["due", "partial", "overdue"]);

function outstandingBalance(record: BillingRecord): number {
  return Math.max(0, record.amountCents - (record.amountPaidCents ?? 0));
}

function isUnpaid(record: BillingRecord): boolean {
  return UNPAID_STATUSES.has(record.status);
}

export function isBillingRecordOverdue(record: BillingRecord, now = new Date()): boolean {
  if (record.status === "overdue") return true;
  if (!isUnpaid(record)) return false;
  return new Date(record.dueAt).getTime() < now.getTime();
}

function isInCurrentMonth(iso: string | undefined, now = new Date()): boolean {
  if (!iso) return false;
  const date = new Date(iso);
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
}

function normalizeToMonthlyCents(amountCents: number, cadence: "monthly" | "yearly" | "weekly"): number {
  if (cadence === "monthly") return amountCents;
  if (cadence === "yearly") return Math.round(amountCents / 12);
  return Math.round((amountCents * 52) / 12);
}

function sumCollectedMtdCents(records: BillingRecord[], now = new Date()): number {
  return records.reduce((sum, record) => {
    if (record.status === "paid" && isInCurrentMonth(record.paidAt ?? record.issuedAt, now)) {
      return sum + record.amountCents;
    }

    if (
      record.status === "partial" &&
      record.amountPaidCents &&
      isInCurrentMonth(record.paidAt ?? record.issuedAt, now)
    ) {
      return sum + record.amountPaidCents;
    }

    return sum;
  }, 0);
}

function sumMrrCents(records: BillingRecord[]): number {
  let total = 0;
  const seenSeries = new Set<string>();
  const orgsWithSeries = new Set<string>();

  for (const record of records) {
    if (!record.recurrence) continue;

    if (seenSeries.has(record.recurrence.seriesId)) continue;
    seenSeries.add(record.recurrence.seriesId);
    if (record.org?.id) orgsWithSeries.add(record.org.id);

    total += normalizeToMonthlyCents(record.amountCents, record.recurrence.cadence);
  }

  const orgMrr = new Map<string, number>();
  for (const record of records) {
    if (!record.mrrCents || !record.org?.id) continue;
    orgMrr.set(record.org.id, Math.max(orgMrr.get(record.org.id) ?? 0, record.mrrCents));
  }

  for (const [orgId, mrrCents] of orgMrr) {
    if (!orgsWithSeries.has(orgId)) {
      total += mrrCents;
    }
  }

  return total;
}

function sumMonthlyBurnCents(records: BillingRecord[]): number {
  let total = 0;
  const seenSeries = new Set<string>();

  for (const record of records) {
    if (!record.recurrence) continue;
    if (seenSeries.has(record.recurrence.seriesId)) continue;
    seenSeries.add(record.recurrence.seriesId);
    total += normalizeToMonthlyCents(record.amountCents, record.recurrence.cadence);
  }

  return total;
}

export type BillingDashboardMetrics = {
  mrrCents: number;
  outstandingCents: number;
  collectedMtdCents: number;
  overdueCount: number;
  dueSoonCount: number;
  paidMtdCents: number;
  monthlyBurnCents: number;
};

export function computeBillingDashboardMetrics(
  records: BillingRecord[],
  direction: BillingDirection,
  now = new Date(),
): BillingDashboardMetrics {
  const scoped = records.filter((record) => record.direction === direction);
  const unpaid = scoped.filter(isUnpaid);
  const overdue = scoped.filter((record) => isBillingRecordOverdue(record, now));

  const dueSoon = scoped.filter((record) => {
    if (!isUnpaid(record) || isBillingRecordOverdue(record, now)) return false;
    const dueMs = new Date(record.dueAt).getTime();
    const horizonMs = now.getTime() + 14 * 24 * 60 * 60 * 1000;
    return dueMs >= now.getTime() && dueMs <= horizonMs;
  });

  return {
    mrrCents: direction === "receivable" ? sumMrrCents(scoped) : 0,
    outstandingCents: unpaid.reduce((sum, record) => sum + outstandingBalance(record), 0),
    collectedMtdCents:
      direction === "receivable" ? sumCollectedMtdCents(scoped, now) : 0,
    overdueCount: overdue.length,
    dueSoonCount: dueSoon.length,
    paidMtdCents: direction === "payable" ? sumCollectedMtdCents(scoped, now) : 0,
    monthlyBurnCents: direction === "payable" ? sumMonthlyBurnCents(scoped) : 0,
  };
}

export function formatBillingMetricMoney(amountCents: number, currency = "USD"): string {
  return formatBillingMoney(amountCents, currency);
}
