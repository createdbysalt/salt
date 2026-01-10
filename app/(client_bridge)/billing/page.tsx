import { getTenantContext } from "@/libs/tenancy";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function BridgeBillingPage() {
  const { context } = await getTenantContext();

  if (!context.userId) {
    redirect("/bridge/login");
  }

  if (!context.client) {
    redirect("/bridge/select");
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
          <Badge variant="secondary" className="font-semibold">
            🚧 Coming Q1-Q2 2026
          </Badge>
        </div>
        <p className="text-muted-foreground">
          Invoices, payment history, and subscription details
        </p>
      </div>

      {/* Empty State */}
      <Card>
        <CardHeader>
          <CardTitle>Transparent Billing & Invoicing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-primary/10 p-4 mb-4">
              <CreditCard className="h-12 w-12 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Billing Dashboard Coming Soon</h3>
            <p className="text-sm text-muted-foreground max-w-md mb-6">
              The Billing section will provide transparent access to all invoices, payment history, 
              subscription details, and upcoming charges—giving you complete visibility into your 
              studio relationship and making payment management simple.
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4" />
              <span>Billing features launching Q1-Q2 2026</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
