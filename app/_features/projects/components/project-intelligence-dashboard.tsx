"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { TrendingUp, Shield, Search } from "lucide-react";
import { Badge } from "@/app/_components/ui/badge";

interface ProjectIntelligenceDashboardProps {
  performanceScore?: number;
  seoScore?: number;
  securityScore?: number;
  strategicContext?: {
    positioning?: string;
    target?: string;
    competitors?: number;
  };
}

export function ProjectIntelligenceDashboard({
  performanceScore,
  seoScore,
  securityScore,
  strategicContext,
}: ProjectIntelligenceDashboardProps) {
  const getScoreColor = (score?: number) => {
    if (!score) return "text-muted-foreground";
    if (score >= 90) return "text-success";
    if (score >= 70) return "text-warning";
    return "text-destructive";
  };

  const getScoreIcon = (score?: number) => {
    if (!score) return "○";
    if (score >= 90) return "✓";
    if (score >= 70) return "⚠️";
    return "⚠️";
  };

  return (
    <div className="space-y-6">
      {/* Intelligence Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Intelligence Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                <span>Performance</span>
              </div>
              <div className={`text-3xl font-bold ${getScoreColor(performanceScore)}`}>
                {performanceScore || "--"}/100 <span className="text-xl">{getScoreIcon(performanceScore)}</span>
              </div>
              {!performanceScore && (
                <Badge variant="outline" className="text-xs">
                  🚧 Coming soon
                </Badge>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Search className="h-4 w-4" />
                <span>SEO</span>
              </div>
              <div className={`text-3xl font-bold ${getScoreColor(seoScore)}`}>
                {seoScore || "--"}/100 <span className="text-xl">{getScoreIcon(seoScore)}</span>
              </div>
              {!seoScore && (
                <Badge variant="outline" className="text-xs">
                  🚧 Coming soon
                </Badge>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4" />
                <span>Security</span>
              </div>
              <div className={`text-3xl font-bold ${getScoreColor(securityScore)}`}>
                {securityScore || "--"}/100 <span className="text-xl">{getScoreIcon(securityScore)}</span>
              </div>
              {!securityScore && (
                <Badge variant="outline" className="text-xs">
                  🚧 Coming soon
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Strategic Context */}
      {strategicContext && (
        <Card>
          <CardHeader>
            <CardTitle>Strategic Context</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              {strategicContext.positioning && (
                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground min-w-[120px]">Positioning Brief:</span>
                  <span className="font-medium">{strategicContext.positioning}</span>
                </div>
              )}
              {strategicContext.target && (
                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground min-w-[120px]">Target:</span>
                  <span className="font-medium">{strategicContext.target}</span>
                </div>
              )}
              {strategicContext.competitors !== undefined && (
                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground min-w-[120px]">Competitors:</span>
                  <span className="font-medium">{strategicContext.competitors} tracked</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
