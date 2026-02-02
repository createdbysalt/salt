"use client";

import { Sparkles, ChevronRight, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { Button } from "@/app/_components/ui/button";
import { strategyRoutes } from "../../../routes";

interface Insight {
  id: string;
  content: string;
  source: string;
  timestamp: string;
  href?: string;
}

/**
 * RecentInsights - Shows latest intelligence snippets
 * AI-generated insights from reports, audits, and monitoring
 */
export function RecentInsights() {
  // Mock data - will be replaced with real insights from intelligence system
  const insights: Insight[] = [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Recent Insights
          </CardTitle>
          {insights.length > 0 && (
            <Button variant="ghost" size="sm" className="h-auto py-1 px-2" asChild>
              <a href={strategyRoutes.intelligence.library}>
                <span className="text-xs">View all</span>
                <ChevronRight className="h-3 w-3 ml-1" />
              </a>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {insights.length === 0 ? (
          <div className="text-center py-6">
            <Sparkles className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">No insights yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Generate reports or audits to see AI insights here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {insights.map((insight) => (
              <div
                key={insight.id}
                className="p-3 rounded-md bg-muted/30 border border-border/50"
              >
                <p className="text-sm leading-relaxed">&ldquo;{insight.content}&rdquo;</p>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/30">
                  <span className="text-xs text-muted-foreground">
                    {insight.source}
                  </span>
                  {insight.href && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto py-0.5 px-1.5"
                      asChild
                    >
                      <a href={insight.href}>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
