import { getTenantContext } from "@/libs/tenancy";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function BridgeIntelligencePage() {
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
          <h1 className="text-3xl font-bold tracking-tight">Intelligence</h1>
          <Badge variant="secondary" className="font-semibold">
            🚧 Coming Q1-Q2 2026
          </Badge>
        </div>
        <p className="text-muted-foreground">
          Strategic insights and measurable results that prove your investment
        </p>
      </div>

      {/* Empty State */}
      <Card>
        <CardHeader>
          <CardTitle>Strategic + Technical Intelligence</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-primary/10 p-4 mb-4">
              <TrendingUp className="h-12 w-12 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Intelligence Dashboard Coming Soon</h3>
            <p className="text-sm text-muted-foreground max-w-md mb-6">
              This section will showcase strategic reports (competitive analyses, positioning strategies) 
              and performance intelligence (site speed, SEO rankings, conversion metrics)—demonstrating the 
              continuous value and measurable results your studio delivers.
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4" />
              <span>Intelligence features launching Q1-Q2 2026</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
