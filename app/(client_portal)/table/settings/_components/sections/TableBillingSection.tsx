"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  RefreshCw,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  CreditCard,
} from "lucide-react"
import {
  Badge,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui"
import { toast } from "sonner"
import { createBridgeInvoiceCheckoutAction } from "@/app/_features/billing/actions"
import { TableSettingsSection } from "../TableSettingsSection"
import { TableSettingsCard } from "../TableSettingsCard"
import { TableSettingsRow } from "../TableSettingsRow"

// Types
export interface BridgePaymentMethod {
  brand: string
  last4: string
  expMonth: number
  expYear: number
}

export interface BridgeRetainer {
  id: string
  description: string | null
  amountCents: number
  interval: "month" | "year"
  status: "active" | "trialing" | "past_due" | "canceled" | "pending"
  currentPeriodEnd: string | null
  paymentMethod: BridgePaymentMethod | null
}

export interface BridgeInvoice {
  id: string
  description: string | null
  amountCents: number
  currency: string
  status: "draft" | "sent" | "viewed" | "paid" | "failed"
  dueDate: string | null
  paidAt: string | null
  createdAt: string
}

export interface BridgeBillingSummary {
  totalPaidCents: number
  outstandingCents: number
  unpaidCount: number
  currency: string
}

export interface TableBillingSectionProps {
  retainer: BridgeRetainer | null
  invoices: BridgeInvoice[]
  summary: BridgeBillingSummary
}

// Helpers
function formatCurrency(cents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(cents / 100)
}

function formatDate(date: string | null): string {
  if (!date) return "—"
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function getRetainerStatusBadge(status: BridgeRetainer["status"]) {
  switch (status) {
    case "active":
    case "trialing":
      return <Badge variant="default">Active</Badge>
    case "pending":
      return <Badge variant="secondary">Pending</Badge>
    case "past_due":
      return <Badge variant="destructive">Past Due</Badge>
    case "canceled":
      return <Badge variant="outline">Canceled</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

function formatCardBrand(brand: string): string {
  const brandMap: Record<string, string> = {
    visa: "Visa",
    mastercard: "Mastercard",
    amex: "American Express",
    discover: "Discover",
    diners: "Diners Club",
    jcb: "JCB",
    unionpay: "UnionPay",
  }
  return brandMap[brand.toLowerCase()] || brand.charAt(0).toUpperCase() + brand.slice(1)
}

function getInvoiceStatusBadge(status: BridgeInvoice["status"]) {
  switch (status) {
    case "paid":
      return (
        <Badge variant="outline" className="border-success/50 bg-success/10 text-success">
          Paid
        </Badge>
      )
    case "sent":
    case "viewed":
      return <Badge variant="secondary">Pending</Badge>
    case "failed":
      return <Badge variant="destructive">Failed</Badge>
    case "draft":
      return <Badge variant="outline">Draft</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

// Pay Invoice Button Component
function PayInvoiceButton({ invoiceId }: { invoiceId: string }) {
  const router = useRouter()
  const [isPaying, setIsPaying] = React.useState(false)

  async function handlePay() {
    setIsPaying(true)
    try {
      const baseUrl = window.location.origin
      const result = await createBridgeInvoiceCheckoutAction({
        invoiceId,
        successUrl: `${baseUrl}/table/settings/billing?payment=success`,
        cancelUrl: `${baseUrl}/table/settings/billing?payment=canceled`,
      })

      if (result.ok && result.data?.url) {
        // Redirect to Stripe Checkout
        router.push(result.data.url)
      } else if (!result.ok) {
        toast.error(result.message || "Failed to create payment session")
        setIsPaying(false)
      }
    } catch {
      toast.error("Something went wrong. Please try again.")
      setIsPaying(false)
    }
  }

  return (
    <Button size="sm" onClick={handlePay} disabled={isPaying}>
      {isPaying ? (
        <>
          <Loader2 className="size-3 animate-spin" />
          Processing...
        </>
      ) : (
        "Pay"
      )}
    </Button>
  )
}

export function TableBillingSection({
  retainer,
  invoices,
  summary,
}: TableBillingSectionProps) {
  const hasPaymentHistory = summary.totalPaidCents > 0 || summary.outstandingCents > 0

  return (
    <div className="space-y-8">
      {/* Retainer Section */}
      <TableSettingsSection title="Retainer">
        <TableSettingsCard>
          {retainer ? (
            <>
              <div className="flex items-center justify-between px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-muted p-2">
                    <RefreshCw className="size-4 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="font-medium">
                      {retainer.description || "Monthly Retainer"}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatCurrency(retainer.amountCents, "USD")}/{retainer.interval}
                      {retainer.currentPeriodEnd && (
                        <> &middot; Next billing: {formatDate(retainer.currentPeriodEnd)}</>
                      )}
                    </div>
                  </div>
                </div>
                {getRetainerStatusBadge(retainer.status)}
              </div>
              {retainer.paymentMethod && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-muted p-2">
                      <CreditCard className="size-4 text-muted-foreground" />
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">
                        {formatCardBrand(retainer.paymentMethod.brand)}
                      </span>
                      <span className="text-muted-foreground">
                        {" "}ending in {retainer.paymentMethod.last4}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Expires {retainer.paymentMethod.expMonth}/{retainer.paymentMethod.expYear}
                  </span>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center gap-3 px-4 py-6">
              <div className="rounded-full bg-muted p-2">
                <Clock className="size-4 text-muted-foreground" />
              </div>
              <div>
                <div className="text-sm font-medium">No active retainer</div>
                <div className="text-sm text-muted-foreground">
                  Your studio hasn&apos;t set up a recurring subscription.
                </div>
              </div>
            </div>
          )}
        </TableSettingsCard>
      </TableSettingsSection>

      {/* Invoices Section */}
      <TableSettingsSection title="Invoices">
        {invoices.length > 0 ? (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">
                      {invoice.description || "Invoice"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(invoice.createdAt)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(invoice.dueDate)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(invoice.amountCents, invoice.currency)}
                    </TableCell>
                    <TableCell>{getInvoiceStatusBadge(invoice.status)}</TableCell>
                    <TableCell>
                      {["sent", "viewed"].includes(invoice.status) && (
                        <PayInvoiceButton invoiceId={invoice.id} />
                      )}
                      {invoice.status === "paid" && (
                        <CheckCircle className="size-4 text-success" />
                      )}
                      {invoice.status === "failed" && (
                        <AlertCircle className="size-4 text-destructive" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <TableSettingsCard>
            <div className="flex items-center gap-3 px-4 py-6">
              <div className="rounded-full bg-muted p-2">
                <FileText className="size-4 text-muted-foreground" />
              </div>
              <div>
                <div className="text-sm font-medium">No invoices yet</div>
                <div className="text-sm text-muted-foreground">
                  Invoices from your studio will appear here.
                </div>
              </div>
            </div>
          </TableSettingsCard>
        )}
      </TableSettingsSection>

      {/* Payment Summary Section - only show if there's payment history */}
      {hasPaymentHistory && (
        <TableSettingsSection title="Payment Summary">
          <TableSettingsCard>
            <TableSettingsRow label="Total Paid">
              <span className="font-medium text-success">
                {formatCurrency(summary.totalPaidCents, summary.currency)}
              </span>
            </TableSettingsRow>
            {summary.outstandingCents > 0 && (
              <TableSettingsRow label="Outstanding">
                <span className="font-medium text-warning">
                  {formatCurrency(summary.outstandingCents, summary.currency)}
                  <span className="text-muted-foreground font-normal ml-1">
                    ({summary.unpaidCount} invoice{summary.unpaidCount !== 1 ? "s" : ""})
                  </span>
                </span>
              </TableSettingsRow>
            )}
          </TableSettingsCard>
        </TableSettingsSection>
      )}
    </div>
  )
}
