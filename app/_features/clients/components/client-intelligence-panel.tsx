"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Users, Building2, DollarSign } from "lucide-react";

interface ClientIntelligence {
  industry?: string;
  positioning?: string;
  target_market?: string;
  competitors?: string[];
  monthly_retainer_value?: number;
  next_review_date?: string;
}

interface ClientIntelligencePanelProps {
  intelligence?: ClientIntelligence;
  clientId: string;
}

export function ClientIntelligencePanel({
  intelligence,
  clientId,
}: ClientIntelligencePanelProps) {
  const hasIntelligence = intelligence && (
    intelligence.industry ||
    intelligence.positioning ||
    intelligence.target_market ||
    (intelligence.competitors && intelligence.competitors.length > 0)
  );

  if (!hasIntelligence) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Client Intelligence</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Building2 className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground mb-4">
              No strategic context yet
            </p>
            <Button variant="outline" size="sm" disabled>
              Add Strategic Context
              <Badge variant="outline" className="ml-2 text-xs">
                🚧
              </Badge>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Strategic Context */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Strategic Context</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {intelligence.industry && (
            <div className="flex items-start gap-2">
              <span className="text-muted-foreground min-w-[100px]">Industry:</span>
              <span className="font-medium">{intelligence.industry}</span>
            </div>
          )}
          {intelligence.positioning && (
            <div className="flex items-start gap-2">
              <span className="text-muted-foreground min-w-[100px]">Positioning:</span>
              <span className="font-medium">{intelligence.positioning}</span>
            </div>
          )}
          {intelligence.target_market && (
            <div className="flex items-start gap-2">
              <span className="text-muted-foreground min-w-[100px]">Target Market:</span>
              <span className="font-medium">{intelligence.target_market}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Competitive Landscape */}
      {intelligence.competitors && intelligence.competitors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Competitive Landscape</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <span className="text-muted-foreground min-w-[100px]">Primary:</span>
              <span className="font-medium">{intelligence.competitors.join(", ")}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-muted-foreground min-w-[100px]">Monitored:</span>
              <span className="font-medium">{intelligence.competitors.length} competitors</span>
            </div>
            <div className="pt-2">
              <Button variant="outline" size="sm" className="w-full" disabled>
                View Full Analysis →
                <Badge variant="outline" className="ml-2 text-xs">
                  🚧
                </Badge>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Retainer Intelligence */}
      {intelligence.monthly_retainer_value && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Retainer Intelligence</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <span className="text-muted-foreground min-w-[100px]">Monthly value:</span>
              <span className="font-medium">
                ${intelligence.monthly_retainer_value.toLocaleString()}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-muted-foreground min-w-[100px]">Services:</span>
              <span className="font-medium">Strategic advisory + monitoring</span>
            </div>
            {intelligence.next_review_date && (
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground min-w-[100px]">Next review:</span>
                <span className="font-medium">
                  {new Date(intelligence.next_review_date).toLocaleDateString()}
                </span>
              </div>
            )}
            <div className="pt-2">
              <Button variant="outline" size="sm" className="w-full" disabled>
                Generate Monthly Report
                <Badge variant="outline" className="ml-2 text-xs">
                  🚧
                </Badge>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Strategic Opportunities */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Strategic Opportunities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground text-sm">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No opportunities identified yet</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
