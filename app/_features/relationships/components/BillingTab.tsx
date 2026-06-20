"use client";

import * as React from "react";
import { useEffect, useState, useMemo, useCallback } from "react";
import { format } from "date-fns";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import {
  CreditCard,
  AlertCircle,
  ArrowUpDown,
  Plus,
  MoreHorizontal,
  Send,
  Eye,
  Trash2,
  RefreshCw,
  FileText,
  TrendingUp,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Progress,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@repo/ui";
import { cn } from "@repo/utils";
import {
  getClientBilling,
  type ClientBillingData,
  type ClientInvoice,
  type ClientRetainer,
} from "@/app/actions/billing/get-client-billing";
import { RetainerDetailPanel } from "./RetainerDetailPanel";

// =============================================================================
// Types
// =============================================================================

interface BillingTabProps {
  clientId: string;
  clientName: string;
  className?: string;
}

type InvoiceFilter = "all" | "draft" | "pending" | "paid" | "overdue";

// =============================================================================
// Mock Data (toggle for testing)
// =============================================================================

const USE_MOCK_DATA = true; // Set to false to use real data

const MOCK_DATA: ClientBillingData = {
  currency: "usd",
  overview: {
    totalPaidCents: 1875000, // $18,750
    outstandingCents: 500000, // $5,000
    lastPaymentDate: "2026-02-15T10:30:00Z",
    lastPaymentAmount: 500000,
    activeRetainerCount: 1,
  },
  retainers: [
    {
      id: "ret-1",
      status: "active",
      amountCents: 250000, // $2,500/mo
      currency: "usd",
      interval: "month",
      intervalCount: 1,
      description: "Growth Retainer",
      currentPeriodStart: "2026-02-01T00:00:00Z",
      currentPeriodEnd: "2026-03-01T00:00:00Z",
      createdAt: "2026-01-01T00:00:00Z",
      projectName: "Website Redesign",
      // Stripe Connect fields
      stripeSubscriptionId: "sub_1NoKvJ2eZvKYlo2C8OLvE9pZ",
      stripeCustomerId: "cus_OZc8eZvKYlo2C8",
      collectionMethod: "charge_automatically",
      paymentMethod: {
        brand: "visa",
        last4: "4242",
        expiryMonth: 12,
        expiryYear: 2027,
      },
      cancelAtPeriodEnd: false,
      canceledAt: null,
      trialStart: null,
      trialEnd: null,
      pastDueSince: null,
    },
  ],
  invoices: [
    {
      id: "inv-1",
      invoiceNumber: "INV-2026-0015",
      amountCents: 500000, // $5,000
      currency: "usd",
      status: "sent",
      description: "Website Redesign - Phase 2",
      dueDate: "2026-03-15T00:00:00Z",
      sentAt: "2026-02-20T10:00:00Z",
      paidAt: null,
      createdAt: "2026-02-20T09:00:00Z",
      projectName: "Website Redesign",
    },
    {
      id: "inv-2",
      invoiceNumber: "INV-2026-0012",
      amountCents: 500000,
      currency: "usd",
      status: "paid",
      description: "Website Redesign - Phase 1",
      dueDate: "2026-02-15T00:00:00Z",
      sentAt: "2026-02-01T10:00:00Z",
      paidAt: "2026-02-15T10:30:00Z",
      createdAt: "2026-02-01T09:00:00Z",
      projectName: "Website Redesign",
    },
    {
      id: "inv-3",
      invoiceNumber: "INV-2026-0008",
      amountCents: 250000,
      currency: "usd",
      status: "paid",
      description: "Retainer - February 2026",
      dueDate: "2026-02-01T00:00:00Z",
      sentAt: "2026-01-25T10:00:00Z",
      paidAt: "2026-02-01T08:00:00Z",
      createdAt: "2026-01-25T09:00:00Z",
      projectName: null,
    },
    {
      id: "inv-4",
      invoiceNumber: "INV-2026-0005",
      amountCents: 250000,
      currency: "usd",
      status: "paid",
      description: "Retainer - January 2026",
      dueDate: "2026-01-01T00:00:00Z",
      sentAt: "2025-12-20T10:00:00Z",
      paidAt: "2026-01-01T09:00:00Z",
      createdAt: "2025-12-20T09:00:00Z",
      projectName: null,
    },
    {
      id: "inv-5",
      invoiceNumber: "INV-2025-0042",
      amountCents: 375000,
      currency: "usd",
      status: "paid",
      description: "Discovery & Strategy Session",
      dueDate: "2025-12-15T00:00:00Z",
      sentAt: "2025-12-01T10:00:00Z",
      paidAt: "2025-12-10T14:00:00Z",
      createdAt: "2025-12-01T09:00:00Z",
      projectName: "Website Redesign",
    },
    {
      id: "inv-6",
      invoiceNumber: "INV-2026-0018",
      amountCents: 150000,
      currency: "usd",
      status: "draft",
      description: "Additional design revisions",
      dueDate: null,
      sentAt: null,
      paidAt: null,
      createdAt: "2026-02-25T09:00:00Z",
      projectName: "Website Redesign",
    },
    {
      id: "inv-7",
      invoiceNumber: "INV-2026-0010",
      amountCents: 100000,
      currency: "usd",
      status: "overdue",
      description: "Consulting call - January",
      dueDate: "2026-02-01T00:00:00Z",
      sentAt: "2026-01-15T10:00:00Z",
      paidAt: null,
      createdAt: "2026-01-15T09:00:00Z",
      projectName: null,
    },
  ],
};

// =============================================================================
// Helpers
// =============================================================================

function formatCurrency(cents: number, currency: string = "usd"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function getStatusBadge(status: ClientInvoice["status"]) {
  switch (status) {
    case "draft":
      return (
        <Badge variant="secondary" className="text-xs font-normal">
          Draft
        </Badge>
      );
    case "sent":
    case "viewed":
      return (
        <Badge variant="outline" className="text-xs font-normal">
          Pending
        </Badge>
      );
    case "paid":
      return (
        <Badge variant="outline" className="text-xs font-normal">
          Paid
        </Badge>
      );
    case "overdue":
      // Only overdue gets color - this needs attention
      return (
        <Badge variant="outline" className="text-xs font-normal border-destructive/50 bg-destructive/10 text-destructive">
          Overdue
        </Badge>
      );
    case "canceled":
      return (
        <Badge variant="secondary" className="text-xs font-normal text-muted-foreground">
          Canceled
        </Badge>
      );
    case "failed":
      // Failed also gets color - critical state
      return (
        <Badge variant="outline" className="text-xs font-normal border-destructive/50 bg-destructive/10 text-destructive">
          Failed
        </Badge>
      );
  }
}

function getRetainerStatusBadge(status: ClientRetainer["status"]) {
  switch (status) {
    case "active":
      return (
        <Badge variant="outline" className="text-xs font-normal">
          Active
        </Badge>
      );
    case "pending":
      return (
        <Badge variant="secondary" className="text-xs font-normal">
          Pending
        </Badge>
      );
    case "paused":
      return (
        <Badge variant="outline" className="text-xs font-normal">
          Paused
        </Badge>
      );
    case "canceled":
      return (
        <Badge variant="secondary" className="text-xs font-normal text-muted-foreground">
          Canceled
        </Badge>
      );
    case "past_due":
      // Past due gets color - needs attention
      return (
        <Badge variant="outline" className="text-xs font-normal border-destructive/50 bg-destructive/10 text-destructive">
          Past Due
        </Badge>
      );
  }
}

// =============================================================================
// Overview Cards (matching /studio style)
// =============================================================================

interface OverviewCardsProps {
  overview: ClientBillingData["overview"];
  activeRetainer: ClientRetainer | null;
  currency: string;
  invoiceCount?: {
    paid: number;
    pending: number;
    overdue: number;
  };
}

function OverviewCards({ overview, activeRetainer, currency, invoiceCount }: OverviewCardsProps) {
  // Calculate some contextual values
  const paidInvoiceCount = invoiceCount?.paid || 0;
  const pendingInvoiceCount = invoiceCount?.pending || 0;
  const overdueCount = invoiceCount?.overdue || 0;

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs sm:grid-cols-2 lg:grid-cols-4">
      {/* Total Paid */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Paid</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {formatCurrency(overview.totalPaidCents, currency)}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <TrendingUp className="size-3" />
              {paidInvoiceCount} paid
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Lifetime revenue from this client <TrendingUp className="size-4" />
          </div>
          <div className="text-muted-foreground">
            {paidInvoiceCount} invoice{paidInvoiceCount !== 1 ? "s" : ""} paid to date
          </div>
        </CardFooter>
      </Card>

      {/* Outstanding */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Outstanding</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {formatCurrency(overview.outstandingCents, currency)}
          </CardTitle>
          <CardAction>
            {/* Only use color for overdue - this is critical */}
            {overdueCount > 0 ? (
              <Badge variant="outline" className="border-destructive/50 bg-destructive/10 text-destructive">
                <AlertCircle className="size-3" />
                {overdueCount} overdue
              </Badge>
            ) : (
              <Badge variant="outline">
                {pendingInvoiceCount > 0 ? `${pendingInvoiceCount} pending` : "All paid"}
              </Badge>
            )}
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {overview.outstandingCents > 0 ? (
              <>Awaiting payment {overdueCount > 0 && <AlertCircle className="size-4 text-destructive" />}</>
            ) : (
              <>No outstanding balance</>
            )}
          </div>
          <div className="text-muted-foreground">
            {pendingInvoiceCount > 0
              ? `${pendingInvoiceCount} invoice${pendingInvoiceCount !== 1 ? "s" : ""} awaiting payment`
              : "Client is up to date"}
          </div>
        </CardFooter>
      </Card>

      {/* Active Retainer */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Active Retainer</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {activeRetainer ? (
              <>
                {formatCurrency(activeRetainer.amountCents, activeRetainer.currency)}
                <span className="text-sm font-normal text-muted-foreground">
                  /{activeRetainer.interval === "month" ? "mo" : "yr"}
                </span>
              </>
            ) : (
              <span className="text-muted-foreground">None</span>
            )}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <RefreshCw className="size-3" />
              {activeRetainer ? "Active" : "Set up"}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {activeRetainer ? (
              <>Recurring revenue <RefreshCw className="size-4" /></>
            ) : (
              <>No recurring revenue</>
            )}
          </div>
          <div className="text-muted-foreground">
            {activeRetainer
              ? `Renews ${format(new Date(activeRetainer.currentPeriodEnd || new Date()), "MMM d, yyyy")}`
              : "Set up a retainer for predictable income"}
          </div>
        </CardFooter>
      </Card>

      {/* Last Payment */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Last Payment</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {overview.lastPaymentDate ? (
              format(new Date(overview.lastPaymentDate), "MMM d, yyyy")
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              {overview.lastPaymentAmount
                ? formatCurrency(overview.lastPaymentAmount, currency)
                : "No payments"}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {overview.lastPaymentDate ? (
              <>Payment received</>
            ) : (
              <>No payments yet</>
            )}
          </div>
          <div className="text-muted-foreground">
            {overview.lastPaymentAmount
              ? `${formatCurrency(overview.lastPaymentAmount, currency)} received`
              : "Waiting for first payment"}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

// =============================================================================
// Active Retainer Card (Clickable)
// =============================================================================

interface RetainerCardProps {
  retainer: ClientRetainer;
  currency: string;
  isSelected: boolean;
  onClick: () => void;
}

function RetainerCard({ retainer, currency, isSelected, onClick }: RetainerCardProps) {
  // Calculate billing period progress
  const periodStart = retainer.currentPeriodStart ? new Date(retainer.currentPeriodStart) : null;
  const periodEnd = retainer.currentPeriodEnd ? new Date(retainer.currentPeriodEnd) : null;
  const now = new Date();

  let progressPercent = 0;
  let daysRemaining = 0;

  if (periodStart && periodEnd) {
    const totalDays = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
    const elapsedDays = Math.ceil((now.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
    progressPercent = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));
    daysRemaining = Math.max(0, Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  }

  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-4 cursor-pointer transition-colors hover:bg-muted/50",
        isSelected && "bg-muted/50 ring-1 ring-border"
      )}
      onClick={onClick}
    >
      {/* Header row */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="size-8 rounded-md bg-muted flex items-center justify-center shrink-0">
            <RefreshCw className="size-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium truncate">
                {retainer.description || "Monthly Retainer"}
              </span>
              {getRetainerStatusBadge(retainer.status)}
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {formatCurrency(retainer.amountCents, currency)}/{retainer.interval === "month" ? "mo" : "yr"}
              {retainer.projectName && <> · {retainer.projectName}</>}
            </p>
          </div>
        </div>

        {/* Right side - Just renewal info, no menu */}
        <div className="flex items-center gap-2 shrink-0">
          {periodEnd && daysRemaining > 0 && (
            <Badge variant="secondary" className="text-xs font-normal">
              {daysRemaining}d until renewal
            </Badge>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {periodStart && periodEnd && retainer.status === "active" && (
        <div className="mt-3">
          <Progress value={progressPercent} className="h-1" />
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Invoice Row Actions
// =============================================================================

function InvoiceRowActions({ invoice }: { invoice: ClientInvoice }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8">
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem>
          <Eye className="size-4 mr-2" />
          View
        </DropdownMenuItem>
        {invoice.status === "draft" && (
          <DropdownMenuItem>
            <Send className="size-4 mr-2" />
            Send Invoice
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive focus:text-destructive">
          <Trash2 className="size-4 mr-2" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// =============================================================================
// Invoice Table Columns
// =============================================================================

function createInvoiceColumns(currency: string): ColumnDef<ClientInvoice>[] {
  return [
    {
      accessorKey: "invoiceNumber",
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 hover:text-foreground"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Invoice
          <ArrowUpDown className="size-3.5" />
        </button>
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <FileText className="size-4 text-muted-foreground" />
          <div className="min-w-0">
            <p className="font-medium">{row.original.invoiceNumber}</p>
            {row.original.description && (
              <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                {row.original.description}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "amountCents",
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 hover:text-foreground"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Amount
          <ArrowUpDown className="size-3.5" />
        </button>
      ),
      cell: ({ row }) => (
        <span className="font-medium tabular-nums">
          {formatCurrency(row.original.amountCents, row.original.currency || currency)}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 hover:text-foreground"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Status
          <ArrowUpDown className="size-3.5" />
        </button>
      ),
      cell: ({ row }) => getStatusBadge(row.original.status),
    },
    {
      accessorKey: "dueDate",
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 hover:text-foreground"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Due Date
          <ArrowUpDown className="size-3.5" />
        </button>
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">
          {row.original.dueDate
            ? format(new Date(row.original.dueDate), "MMM d, yyyy")
            : "—"}
        </span>
      ),
      sortingFn: (rowA, rowB) => {
        const a = rowA.original.dueDate ? new Date(rowA.original.dueDate).getTime() : 0;
        const b = rowB.original.dueDate ? new Date(rowB.original.dueDate).getTime() : 0;
        return a - b;
      },
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 hover:text-foreground"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Created
          <ArrowUpDown className="size-3.5" />
        </button>
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">
          {format(new Date(row.original.createdAt), "MMM d, yyyy")}
        </span>
      ),
      sortingFn: (rowA, rowB) => {
        return (
          new Date(rowA.original.createdAt).getTime() -
          new Date(rowB.original.createdAt).getTime()
        );
      },
    },
    {
      id: "actions",
      header: () => null,
      cell: ({ row }) => <InvoiceRowActions invoice={row.original} />,
      enableSorting: false,
      enableHiding: false,
    },
  ];
}

// =============================================================================
// Loading Skeleton
// =============================================================================

function LoadingSkeleton() {
  return (
    <div className="p-6 space-y-6">
      {/* Overview Cards Skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border bg-card p-6">
            <Skeleton className="h-4 w-24 mb-3" />
            <Skeleton className="h-8 w-32" />
          </div>
        ))}
      </div>

      {/* Retainer Section Skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-5 w-32" />
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="size-4" />
            <Skeleton className="h-5 w-48" />
          </div>
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="rounded-lg border">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1, 2, 3].map((i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Skeleton className="size-4" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="size-8" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Empty State
// =============================================================================

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-4">
        <CreditCard className="size-6 text-muted-foreground" />
      </div>
      <h3 className="font-medium mb-1">No invoices yet</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-4">
        Create your first invoice to start billing this client.
      </p>
      <Button size="sm" className="gap-1.5">
        <Plus className="size-4" />
        Create Invoice
      </Button>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function BillingTab({ clientId, clientName, className }: BillingTabProps) {
  const [billingData, setBillingData] = useState<ClientBillingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sorting, setSorting] = useState<SortingState>([
    { id: "createdAt", desc: true },
  ]);
  const [invoiceFilter, setInvoiceFilter] = useState<InvoiceFilter>("all");
  const [selectedRetainer, setSelectedRetainer] = useState<ClientRetainer | null>(null);

  // Fetch billing data
  const fetchBillingData = useCallback(async () => {
    setIsLoading(true);
    try {
      if (USE_MOCK_DATA) {
        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 500));
        setBillingData(MOCK_DATA);
      } else {
        const data = await getClientBilling(clientId);
        setBillingData(data);
      }
    } catch (error) {
      console.error("Error fetching billing data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchBillingData();
  }, [fetchBillingData]);

  // Get active retainer
  const activeRetainer = useMemo(() => {
    if (!billingData) return null;
    return billingData.retainers.find((r) => r.status === "active") || null;
  }, [billingData]);

  // Filter invoices based on tab selection
  const filteredInvoices = useMemo(() => {
    if (!billingData) return [];

    switch (invoiceFilter) {
      case "draft":
        return billingData.invoices.filter((inv) => inv.status === "draft");
      case "pending":
        return billingData.invoices.filter(
          (inv) => inv.status === "sent" || inv.status === "viewed"
        );
      case "paid":
        return billingData.invoices.filter((inv) => inv.status === "paid");
      case "overdue":
        return billingData.invoices.filter((inv) => inv.status === "overdue");
      default:
        return billingData.invoices;
    }
  }, [billingData, invoiceFilter]);

  // Create columns with currency context
  const columns = useMemo(
    () => createInvoiceColumns(billingData?.currency || "usd"),
    [billingData?.currency]
  );

  // Invoice table
  const table = useReactTable({
    data: filteredInvoices,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  // Filter counts
  const filterCounts = useMemo(() => {
    if (!billingData) return { all: 0, draft: 0, pending: 0, paid: 0, overdue: 0 };
    return {
      all: billingData.invoices.length,
      draft: billingData.invoices.filter((inv) => inv.status === "draft").length,
      pending: billingData.invoices.filter(
        (inv) => inv.status === "sent" || inv.status === "viewed"
      ).length,
      paid: billingData.invoices.filter((inv) => inv.status === "paid").length,
      overdue: billingData.invoices.filter((inv) => inv.status === "overdue").length,
    };
  }, [billingData]);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (!billingData) {
    return (
      <div className={cn("p-6", className)}>
        <EmptyState />
      </div>
    );
  }

  // Handle retainer selection
  const handleRetainerClick = (retainer: ClientRetainer) => {
    setSelectedRetainer(retainer);
  };

  const handleClosePanel = () => {
    setSelectedRetainer(null);
  };

  return (
    <div className={cn("flex-1 flex min-h-0", className)}>
      {/* Main Content */}
      <div className="flex-1 min-w-0 overflow-y-auto p-6 space-y-6">
        {/* Overview Cards */}
        <OverviewCards
          overview={billingData.overview}
          activeRetainer={activeRetainer}
          currency={billingData.currency}
          invoiceCount={{
            paid: filterCounts.paid,
            pending: filterCounts.pending,
            overdue: filterCounts.overdue,
          }}
        />

        {/* Retainers Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">
              Retainers
            </h3>
          </div>
          {billingData.retainers.length > 0 ? (
            <div className="space-y-2">
              {billingData.retainers.map((retainer) => (
                <RetainerCard
                  key={retainer.id}
                  retainer={retainer}
                  currency={billingData.currency}
                  isSelected={selectedRetainer?.id === retainer.id}
                  onClick={() => handleRetainerClick(retainer)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed bg-muted/30 p-6">
              <div className="flex flex-col items-center justify-center text-center">
                <RefreshCw className="size-8 text-muted-foreground/50 mb-3" />
                <p className="text-sm font-medium">No retainers</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Set up a recurring retainer for predictable revenue.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Invoices Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">Invoices</h3>
            <Button size="sm" variant="ghost" className="gap-1.5 text-muted-foreground hover:text-foreground">
              <Plus className="size-4" />
              Create Invoice
            </Button>
          </div>

          {/* Filter Tabs */}
          <Tabs
            value={invoiceFilter}
            onValueChange={(value) => setInvoiceFilter(value as InvoiceFilter)}
          >
            <TabsList className="**:data-[slot=badge]:bg-muted-foreground/30 **:data-[slot=badge]:size-5 **:data-[slot=badge]:rounded-full **:data-[slot=badge]:px-1">
              <TabsTrigger value="all">
                All {filterCounts.all > 0 && <Badge variant="secondary">{filterCounts.all}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="draft">
                Draft {filterCounts.draft > 0 && <Badge variant="secondary">{filterCounts.draft}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="pending">
                Pending {filterCounts.pending > 0 && <Badge variant="secondary">{filterCounts.pending}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="paid">
                Paid {filterCounts.paid > 0 && <Badge variant="secondary">{filterCounts.paid}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="overdue">
                Overdue {filterCounts.overdue > 0 && <Badge variant="secondary">{filterCounts.overdue}</Badge>}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Invoice Table */}
          {filteredInvoices.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader className="bg-muted/50">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead
                          key={header.id}
                          className={cn(header.id === "actions" && "w-12")}
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id} className="hover:bg-muted/50">
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      {/* Right Side - Retainer Detail Panel */}
      {selectedRetainer && (
        <div className="w-[340px] shrink-0 border-l">
          <RetainerDetailPanel
            retainer={selectedRetainer}
            currency={billingData.currency}
            invoices={billingData.invoices.filter((inv) => {
              // Match by project if retainer has a project
              if (selectedRetainer.projectName && inv.projectName === selectedRetainer.projectName) {
                return true;
              }
              // Match by description containing "retainer" (case-insensitive)
              if (inv.description?.toLowerCase().includes("retainer")) {
                return true;
              }
              return false;
            })}
            onClose={handleClosePanel}
            onPause={async (id) => {
              // TODO: Implement Stripe pause subscription
              console.log("Pause retainer:", id);
            }}
            onResume={async (id) => {
              // TODO: Implement Stripe resume subscription
              console.log("Resume retainer:", id);
            }}
            onCancel={async (id) => {
              // TODO: Implement Stripe cancel subscription
              console.log("Cancel retainer:", id);
            }}
            onOpenCustomerPortal={async (id) => {
              // TODO: Implement Stripe Customer Portal redirect
              console.log("Open customer portal for:", id);
            }}
            className="h-full"
          />
        </div>
      )}
    </div>
  );
}
