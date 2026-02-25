"use client";

import React, { useState, useMemo } from "react";
import { Badge } from "@/app/_components/ui/badge";
import { Button } from "@/app/_components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/_components/ui/table";
import { FileText, Plus, Send, AlertCircle } from "lucide-react";
import {
  InvoiceFilterPills,
  type InvoiceFilter,
} from "@/app/_features/billing/components";

type Invoice = {
  id: string;
  invoice_number: string;
  amount_cents: number;
  currency: string;
  description: string;
  status: "draft" | "sent" | "viewed" | "paid" | "overdue" | "canceled" | "failed";
  due_date: string | null;
  created_at: string;
  sent_at: string | null;
  paid_at: string | null;
};

type ClientBillingSectionProps = {
  clientId: string;
  invoices: Invoice[];
  onCreateInvoice: () => void;
  onSendInvoice?: (invoiceId: string) => void;
};

const STATUS_BADGES: Record<Invoice["status"], { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground border-border" },
  sent: { label: "Sent", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
  viewed: { label: "Viewed", className: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" },
  paid: { label: "Paid", className: "bg-success/10 text-success border-success/20" },
  overdue: { label: "Overdue", className: "bg-warning/10 text-warning border-warning/20" },
  canceled: { label: "Canceled", className: "bg-muted text-muted-foreground border-border" },
  failed: { label: "Failed", className: "bg-destructive/10 text-destructive border-destructive/20" },
};

function formatCurrency(amountCents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ClientBillingSection({
  clientId: _clientId,
  invoices,
  onCreateInvoice,
  onSendInvoice,
}: ClientBillingSectionProps) {
  const [activeFilter, setActiveFilter] = useState<InvoiceFilter>("all");

  // Calculate filter counts
  const filterCounts = useMemo(() => {
    const unpaidStatuses = ["draft", "sent", "viewed", "overdue", "failed"];
    return {
      all: invoices.length,
      unpaid: invoices.filter((inv) => unpaidStatuses.includes(inv.status)).length,
      paid: invoices.filter((inv) => inv.status === "paid").length,
      overdue: invoices.filter((inv) => inv.status === "overdue").length,
    };
  }, [invoices]);

  // Filter invoices based on active filter
  const filteredInvoices = useMemo(() => {
    if (activeFilter === "all") return invoices;
    if (activeFilter === "paid") return invoices.filter((inv) => inv.status === "paid");
    if (activeFilter === "overdue") return invoices.filter((inv) => inv.status === "overdue");
    // unpaid = draft, sent, viewed, overdue, failed
    const unpaidStatuses = ["draft", "sent", "viewed", "overdue", "failed"];
    return invoices.filter((inv) => unpaidStatuses.includes(inv.status));
  }, [invoices, activeFilter]);

  const failedInvoices = invoices.filter((inv) => inv.status === "failed");
  const hasFailedPayments = failedInvoices.length > 0;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Invoices</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {invoices.length} total
          </p>
        </div>
        <Button onClick={onCreateInvoice} size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-1" />
          Create
        </Button>
      </div>

      {/* Failed Payment Alert */}
      {hasFailedPayments && (
        <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-destructive">
                {failedInvoices.length} Payment{failedInvoices.length !== 1 ? "s" : ""} Failed
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Contact your client to retry payment or update their payment method.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filter Pills */}
      {invoices.length > 0 && (
        <InvoiceFilterPills
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          counts={filterCounts}
        />
      )}

      {invoices.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm font-medium mb-1">No invoices yet</p>
          <p className="text-xs mb-3">
            Create your first invoice to start billing this client.
          </p>
          <Button onClick={onCreateInvoice} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Create First Invoice
          </Button>
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground">
          <p className="text-sm">No {activeFilter} invoices</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[100px]">Invoice</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-[100px]">Amount</TableHead>
                <TableHead className="w-[90px]">Status</TableHead>
                <TableHead className="w-[100px]">Due</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map((invoice) => {
                const statusConfig = STATUS_BADGES[invoice.status];
                return (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {invoice.invoice_number}
                    </TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">
                      {invoice.description || "—"}
                    </TableCell>
                    <TableCell className="text-sm font-medium tabular-nums">
                      {formatCurrency(invoice.amount_cents, invoice.currency)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={statusConfig.className}
                      >
                        {statusConfig.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(invoice.due_date)}
                    </TableCell>
                    <TableCell>
                      {invoice.status === "draft" && onSendInvoice && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2"
                          onClick={() => onSendInvoice(invoice.id)}
                        >
                          <Send className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}
