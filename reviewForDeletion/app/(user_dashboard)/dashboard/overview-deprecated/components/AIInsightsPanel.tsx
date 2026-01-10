import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp, Users, Zap, DollarSign, ArrowRight } from "lucide-react";
import Link from "next/link";
import type { AIInsight } from "../actions/generate-ai-insights";

interface AIInsightsPanelProps {
  insights: AIInsight[];
}

const typeIcons = {
  revenue: DollarSign,
  retention: Users,
  efficiency: Zap,
  growth: TrendingUp,
};

const typeColors = {
  revenue: "text-success",
  retention: "text-warning",
  efficiency: "text-info",
  growth: "text-primary",
};

export function AIInsightsPanel({ insights }: AIInsightsPanelProps) {
  if (insights.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle>Weekly Insights</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Not enough data yet. Keep adding projects and clients to get insights.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <CardTitle>Weekly Insights</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {insights.map((insight) => {
          const Icon = typeIcons[insight.type];
          const colorClass = typeColors[insight.type];

          return (
            <div
              key={insight.id}
              className="p-4 rounded-lg border bg-card/50 hover:bg-card transition-colors space-y-3"
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 ${colorClass}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 space-y-2">
                  <p className="text-sm leading-relaxed">{insight.insight}</p>
                  <Link href={insight.actionLink}>
                    <Button variant="ghost" size="sm" className="h-8 px-3 text-xs -ml-3">
                      {insight.actionLabel}
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}




