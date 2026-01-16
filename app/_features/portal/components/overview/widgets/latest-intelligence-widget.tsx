import type { WidgetProps } from "@/types/bridge-overview";
import { Card, CardContent } from "@/app/_components/ui/card";
import { Button } from "@/app/_components/ui/button";
import { Badge } from "@/app/_components/ui/badge";
import { TrendingUp, Sparkles } from "lucide-react";
import Link from "next/link";

/**
 * Latest Intelligence Widget
 * Shows the most recent intelligence report or insight
 */
export function LatestIntelligenceWidget({ config, data }: WidgetProps) {
  // This is UI-only placeholder - in real implementation would fetch from intelligence table
  const hasIntelligence = false;

  if (!hasIntelligence) {
    return (
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Latest Intelligence</h2>
          <Badge variant="secondary" className="font-semibold">
            🚧 Coming Q1-Q2 2026
          </Badge>
        </div>
        <Card className="border-dashed">
          <CardContent className="py-12">
            <div className="text-center">
              <div className="rounded-full bg-primary/10 p-4 inline-block mb-4">
                <TrendingUp className="h-12 w-12 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Intelligence Reports Coming Soon</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
                This section will showcase strategic insights and performance intelligence demonstrating the continuous value your studio delivers.
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4" />
                <span>Intelligence features launching Q1-Q2 2026</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    );
  }

  // Future: Real intelligence display
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Latest Intelligence</h2>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/bridge/intelligence">View all</Link>
        </Button>
      </div>
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="rounded-full bg-primary/10 p-3 shrink-0">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="default" className="text-xs">New Report</Badge>
                <span className="text-xs text-muted-foreground">2 hours ago</span>
              </div>
              <h3 className="font-semibold text-lg mb-2">Performance Intelligence Report</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Your site performance improved significantly this month. Speed increased 15%, SEO rankings gained 8 positions, and conversions are up 23%.
              </p>
              <Button variant="default" size="sm" asChild>
                <Link href="/bridge/intelligence">View full report →</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
