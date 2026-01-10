"use client";

import Link from "next/link";

interface ClientWithFailedPayments {
  id: string;
  name: string;
  failedInvoices: number;
  failedRetainers: boolean;
}

interface ClientBillingOverviewCardProps {
  totalReceivedCents: number;
  pendingInvoiceCount: number;
  activeRetainerCount: number;
  failedPayments: ClientWithFailedPayments[];
  clientsWithActivity: Array<{
    id: string;
    name: string;
    pendingInvoices: number;
    activeRetainer: boolean;
  }>;
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export default function ClientBillingOverviewCard({
  totalReceivedCents,
  pendingInvoiceCount,
  activeRetainerCount,
  failedPayments,
  clientsWithActivity,
}: ClientBillingOverviewCardProps) {
  const hasFailedPayments = failedPayments.length > 0;

  return (
    <div className="bg-card border rounded-lg p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold">Client Billing Overview</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Summary of your client invoices and retainers
          </p>
        </div>
      </div>

      {/* Failed Payment Alert */}
      {hasFailedPayments && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <div className="flex-1">
              <p className="font-semibold text-red-800">Failed Payments</p>
              <p className="text-sm text-red-700 mt-1">
                {failedPayments.length} client{failedPayments.length !== 1 ? "s" : ""} with failed payments. Follow up to resolve.
              </p>
              <ul className="mt-2 space-y-1">
                {failedPayments.map((client) => (
                  <li key={client.id} className="text-sm text-red-700">
                    <Link
                      href={`/dashboard/clients/${client.id}`}
                      className="font-medium hover:underline"
                    >
                      {client.name}
                    </Link>
                    {" – "}
                    {client.failedInvoices > 0 && (
                      <span>{client.failedInvoices} failed invoice{client.failedInvoices !== 1 ? "s" : ""}</span>
                    )}
                    {client.failedInvoices > 0 && client.failedRetainers && ", "}
                    {client.failedRetainers && <span>retainer payment failed</span>}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-muted/30 rounded-lg text-center">
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(totalReceivedCents)}
          </p>
          <p className="text-sm text-muted-foreground mt-1">Received this month</p>
        </div>
        <div className="p-4 bg-muted/30 rounded-lg text-center">
          <p className="text-2xl font-bold text-amber-600">{pendingInvoiceCount}</p>
          <p className="text-sm text-muted-foreground mt-1">Pending invoices</p>
        </div>
        <div className="p-4 bg-muted/30 rounded-lg text-center">
          <p className="text-2xl font-bold text-blue-600">{activeRetainerCount}</p>
          <p className="text-sm text-muted-foreground mt-1">Active retainers</p>
        </div>
      </div>

      {/* Quick Links to Clients with Activity */}
      {clientsWithActivity.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">
            Clients with Billing Activity
          </h3>
          <div className="space-y-2">
            {clientsWithActivity.slice(0, 5).map((client) => (
              <Link
                key={client.id}
                href={`/dashboard/clients/${client.id}`}
                className="flex items-center justify-between p-3 bg-muted/20 rounded-lg hover:bg-muted/40 transition-colors"
              >
                <span className="font-medium">{client.name}</span>
                <div className="flex items-center gap-2">
                  {client.pendingInvoices > 0 && (
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-800">
                      {client.pendingInvoices} pending
                    </span>
                  )}
                  {client.activeRetainer && (
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                      Retainer
                    </span>
                  )}
                  <svg
                    className="w-4 h-4 text-muted-foreground"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </Link>
            ))}
            {clientsWithActivity.length > 5 && (
              <p className="text-sm text-muted-foreground text-center mt-2">
                +{clientsWithActivity.length - 5} more clients
              </p>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {clientsWithActivity.length === 0 && !hasFailedPayments && (
        <div className="text-center py-8">
          <svg
            className="w-12 h-12 text-muted-foreground mx-auto mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
            />
          </svg>
          <p className="text-muted-foreground">
            No active client billing activity.
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Create invoices or retainers from your client pages.
          </p>
        </div>
      )}
    </div>
  );
}
