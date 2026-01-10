"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileText, Plus, Send, AlertCircle } from "lucide-react";

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
  sent: { label: "Sent", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  viewed: { label: "Viewed", className: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400" },
  paid: { label: "Paid", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  overdue: { label: "Overdue", className: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400" },
  canceled: { label: "Canceled", className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
  failed: { label: "Failed", className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
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
  const failedInvoices = invoices.filter((inv) => inv.status === "failed");
  const hasFailedPayments = failedInvoices.length > 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Invoices</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Manage billing and invoices for this client
          </p>
        </div>
        <Button onClick={onCreateInvoice} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Create Invoice
        </Button>
      </CardHeader>
      <CardContent>
        {/* Failed Payment Alert */}
        {hasFailedPayments && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg dark:bg-red-950/30 dark:border-red-900">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-800 dark:text-red-200">
                  {failedInvoices.length} Payment{failedInvoices.length !== 1 ? "s" : ""} Failed
                </p>
                <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">
                  Contact your client to retry payment or update their payment method.
                </p>
              </div>
            </div>
          </div>
        )}

        {invoices.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No invoices yet</p>
            <p className="text-sm mb-4">
              Create your first invoice to start billing this client.
            </p>
            <Button onClick={onCreateInvoice} variant="outline">
              <Plus className="h-4 w-4 mr-1" />
              Create First Invoice
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => {
                const statusConfig = STATUS_BADGES[invoice.status];
                return (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-mono text-sm">
                      {invoice.invoice_number}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {invoice.description}
                    </TableCell>
                    <TableCell className="font-medium">
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
                    <TableCell className="text-muted-foreground">
                      {formatDate(invoice.due_date)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(invoice.created_at)}
                    </TableCell>
                    <TableCell>
                      {invoice.status === "draft" && onSendInvoice && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onSendInvoice(invoice.id)}
                        >
                          <Send className="h-3 w-3 mr-1" />
                          Send
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
