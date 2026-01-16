import { getTenantContext } from "@/libs/tenancy";
import { createClient } from "@/libs/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, RefreshCw, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function formatDate(date: string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getStatusBadge(status: string) {
  switch (status) {
    case "active":
    case "trialing":
      return <Badge variant="default">Active</Badge>;
    case "pending":
      return <Badge variant="secondary">Pending</Badge>;
    case "past_due":
      return <Badge variant="destructive">Past Due</Badge>;
    case "canceled":
      return <Badge variant="outline">Canceled</Badge>;
    case "paid":
      return <Badge variant="default">Paid</Badge>;
    case "sent":
    case "viewed":
      return <Badge variant="secondary">Unpaid</Badge>;
    case "draft":
      return <Badge variant="outline">Draft</Badge>;
    case "failed":
      return <Badge variant="destructive">Failed</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export default async function BridgeBillingPage() {
  const { context } = await getTenantContext();

  if (!context.userId) {
    redirect("/bridge/login");
  }

  if (!context.client) {
    redirect("/bridge/select");
  }

  const supabase = await createClient();
  const clientId = context.client.id;

  // Get active retainers (subscriptions) for this client
  const { data: retainers } = await supabase
    .from("bridge_client_subscriptions")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  // Get invoices for this client
  const { data: invoices } = await supabase
    .from("bridge_invoices")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(10);

  // Calculate totals
  const paidInvoices = invoices?.filter((inv) => inv.status === "paid") || [];
  const unpaidInvoices = invoices?.filter((inv) => ["sent", "viewed"].includes(inv.status)) || [];
  const totalPaid = paidInvoices.reduce((sum, inv) => sum + inv.amount_cents, 0);
  const totalOutstanding = unpaidInvoices.reduce((sum, inv) => sum + inv.amount_cents, 0);

  // Get active retainer for display
  const activeRetainer = retainers?.find((r) => ["active", "trialing"].includes(r.status));
  const pendingRetainer = retainers?.find((r) => r.status === "pending");

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
        <p className="text-muted-foreground">
          Invoices, payment history, and subscription details
        </p>
      </div>

      {/* Current Subscription */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Retainer
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeRetainer ? (
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">
                  {activeRetainer.description || "Monthly Retainer"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {formatCurrency(activeRetainer.amount_cents)}/{activeRetainer.interval}
                  {activeRetainer.current_period_end && (
                    <> • Next billing: {formatDate(activeRetainer.current_period_end)}</>
                  )}
                </p>
              </div>
              {getStatusBadge(activeRetainer.status)}
            </div>
          ) : pendingRetainer ? (
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">
                  {pendingRetainer.description || "Monthly Retainer"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {formatCurrency(pendingRetainer.amount_cents)}/{pendingRetainer.interval}
                  <span className="text-yellow-600 ml-2">• Awaiting payment setup</span>
                </p>
              </div>
              {getStatusBadge(pendingRetainer.status)}
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No active retainer</p>
              <p className="text-sm">Your studio hasn&apos;t set up a recurring subscription yet.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Invoices */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Invoices
          </CardTitle>
        </CardHeader>
        <CardContent>
          {invoices && invoices.length > 0 ? (
            <div className="space-y-4">
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-start gap-4 flex-1">
                    <div className="rounded-full bg-muted p-2">
                      {invoice.status === "paid" ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : invoice.status === "failed" ? (
                        <XCircle className="h-5 w-5 text-red-600" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-yellow-600" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-medium">
                        {invoice.description || "Invoice"}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(invoice.created_at)}
                        {invoice.due_date && <> • Due: {formatDate(invoice.due_date)}</>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-semibold">
                        {formatCurrency(invoice.amount_cents)}
                      </div>
                      {getStatusBadge(invoice.status)}
                    </div>
                    {["sent", "viewed"].includes(invoice.status) && (
                      <Link href={`/bridge/invoices/${invoice.id}/pay`}>
                        <Button size="sm">Pay now</Button>
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No invoices yet</p>
              <p className="text-sm">Invoices from your studio will appear here.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Summary */}
      {(totalPaid > 0 || totalOutstanding > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Payment Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Paid:</span>
              <span className="font-semibold text-green-600">
                {formatCurrency(totalPaid)}
              </span>
            </div>
            {totalOutstanding > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Outstanding:</span>
                <span className="font-semibold text-yellow-600">
                  {formatCurrency(totalOutstanding)} ({unpaidInvoices.length} invoice{unpaidInvoices.length !== 1 ? "s" : ""})
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
