"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { AlertCircle, CreditCard, DollarSign, FileText } from "lucide-react";
import { Button, StatusPill } from "@repo/ui";
import { EmptyState } from "@repo/patterns";
import { cn } from "@repo/utils";
import type { PersonPaymentsData, PersonInvoiceStatus } from "../getMockPersonPayments";
import { openAskSalt } from "../utils";

const INVOICE_STATUS: Record<
  PersonInvoiceStatus,
  { color: string; label: string }
> = {
  paid: { color: "var(--relationship-clients)", label: "PAID" },
  pending: { color: "var(--relationship-vendors)", label: "PENDING" },
  overdue: { color: "var(--relationship-vendors)", label: "OVERDUE" },
  draft: { color: "var(--relationship-team)", label: "DRAFT" },
};

export function PersonPaymentsTab({
  personName,
  payments,
}: {
  personName: string;
  payments: PersonPaymentsData;
}) {
  const hasInvoices = payments.invoices.length > 0;
  const hasPending = payments.pendingInvoiceActions.length > 0;
  const hasBalance =
    payments.lifetimeValue > 0 || payments.outstandingAmount > 0;

  if (!hasInvoices && !hasPending && !hasBalance) {
    return (
      <EmptyState
        icon={<CreditCard className="size-8" />}
        title="No payment history"
        description="Invoices and payment activity for this person will show up here once billing is linked."
        action={
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              openAskSalt(`Set up billing context for ${personName}.`)
            }
          >
            Ask Salt about billing
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-8">
      <PaymentSummary payments={payments} personName={personName} />

      {hasPending ? (
        <section>
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-muted-foreground">
              Awaiting approval
            </p>
            <Link
              href="/plays"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              View in Plays
            </Link>
          </div>
          <ul className="divide-y divide-border rounded-lg border border-border">
            {payments.pendingInvoiceActions.map((action) => (
              <li key={action.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium">{action.title}</p>
                  <button
                    type="button"
                    className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() =>
                      openAskSalt(
                        `Review this invoice draft for ${personName}: ${action.title}`
                      )
                    }
                  >
                    Review
                  </button>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {action.preview}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-muted-foreground">Invoices</p>
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={() =>
              openAskSalt(`Draft or send an invoice for ${personName}.`)
            }
          >
            New invoice
          </button>
        </div>
        {hasInvoices ? (
          <ul className="divide-y divide-border">
            {payments.invoices.map((invoice) => (
              <PaymentInvoiceRow key={invoice.id} invoice={invoice} />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No invoices on file.</p>
        )}
      </section>
    </div>
  );
}

function PaymentSummary({
  payments,
  personName,
}: {
  payments: PersonPaymentsData;
  personName: string;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <SummaryStat
        label="Lifetime"
        value={`$${payments.lifetimeValue.toLocaleString()}`}
        hint={payments.clientSince ? `Client since ${payments.clientSince}` : undefined}
      />
      <SummaryStat
        label="Outstanding"
        value={`$${payments.outstandingAmount.toLocaleString()}`}
        hint={
          payments.outstandingAmount > 0
            ? "Awaiting payment"
            : "Nothing due"
        }
        highlight={payments.outstandingAmount > 0}
      />
      <SummaryStat
        label="Last payment"
        value={
          payments.lastPaymentAmount != null
            ? `$${payments.lastPaymentAmount.toLocaleString()}`
            : "—"
        }
        hint={payments.lastPaymentLabel ?? "No payments recorded"}
        action={
          payments.outstandingAmount > 0 ? (
            <button
              type="button"
              className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:opacity-80"
              onClick={() => openAskSalt(`Send a payment reminder to ${personName}.`)}
            >
              <AlertCircle className="size-3" />
              Remind
            </button>
          ) : null
        }
      />
    </div>
  );
}

function SummaryStat({
  label,
  value,
  hint,
  highlight,
  action,
}: {
  label: string;
  value: string;
  hint?: string;
  highlight?: boolean;
  action?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border px-4 py-3",
        highlight && "border-warning/30 bg-warning/5"
      )}
    >
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
      {action}
    </div>
  );
}

function PaymentInvoiceRow({
  invoice,
}: {
  invoice: PersonPaymentsData["invoices"][number];
}) {
  const status = INVOICE_STATUS[invoice.status];

  return (
    <li className="flex items-center justify-between gap-4 py-4 first:pt-0">
      <div className="flex min-w-0 items-start gap-3">
        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
          <FileText className="size-4 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium">Invoice #{invoice.number}</p>
            <StatusPill color={status.color} label={status.label} />
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {invoice.dueLabel}
            {invoice.projectName ? ` · ${invoice.projectName}` : ""}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="text-sm font-semibold tabular-nums">
          ${invoice.amount.toLocaleString()}
        </span>
        {invoice.status === "pending" || invoice.status === "overdue" ? (
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={() =>
              openAskSalt(`Review invoice #${invoice.number} before sending.`)
            }
          >
            Review
          </button>
        ) : (
          <DollarSign className="size-3.5 text-muted-foreground/40" />
        )}
      </div>
    </li>
  );
}
