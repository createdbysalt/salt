"use client";

import { TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/ui/card";

export function ThisWeekStats() {
  // Mock data - will be replaced with real stats later
  const stats = {
    reportsGenerated: 0,
    creditsUsed: 0,
    improvementsShipped: 0,
    seoPositionsGained: 0,
  };

  const hasActivity = Object.values(stats).some((val) => val > 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          This Week
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasActivity ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">
              No activity yet this week
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Start generating intelligence to see stats here
            </p>
          </div>
        ) : (
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Intelligence reports</span>
              <span className="font-medium">{stats.reportsGenerated}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Credits used</span>
              <span className="font-medium">{stats.creditsUsed}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Improvements shipped</span>
              <span className="font-medium">{stats.improvementsShipped}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">SEO positions gained</span>
              <span className="font-medium">{stats.seoPositionsGained}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
