import { Badge } from "@repo/ui";
import { AlertTriangle, TrendingUp, Settings } from "lucide-react";
import type { CorrectionPattern } from "@/app/_lib/memory-tools";

interface PatternAlertsListProps {
  patterns: CorrectionPattern[];
}

export function PatternAlertsList({ patterns }: PatternAlertsListProps) {
  return (
    <div className="space-y-3">
      {patterns.map((pattern) => (
        <div
          key={pattern.ruleId}
          className="flex items-start justify-between p-3 rounded-lg border"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-medium">
                {pattern.ruleId}
              </span>
              <RecommendationBadge recommendation={pattern.recommendation} />
            </div>
            <p className="text-sm text-muted-foreground">
              Corrected {pattern.correctionCount} times in the last 30 days
            </p>
          </div>
          <RecommendationIcon recommendation={pattern.recommendation} />
        </div>
      ))}
    </div>
  );
}

function RecommendationBadge({
  recommendation,
}: {
  recommendation: CorrectionPattern["recommendation"];
}) {
  switch (recommendation) {
    case "raise_threshold":
      return (
        <Badge variant="outline" className="text-amber-600 border-amber-200">
          Raise threshold
        </Badge>
      );
    case "review_rule":
      return (
        <Badge variant="outline" className="text-red-600 border-red-200">
          Review rule
        </Badge>
      );
    case "add_condition":
      return (
        <Badge variant="outline" className="text-blue-600 border-blue-200">
          Add condition
        </Badge>
      );
    default:
      return null;
  }
}

function RecommendationIcon({
  recommendation,
}: {
  recommendation: CorrectionPattern["recommendation"];
}) {
  switch (recommendation) {
    case "raise_threshold":
      return <TrendingUp className="size-5 text-amber-600" />;
    case "review_rule":
      return <AlertTriangle className="size-5 text-red-600" />;
    case "add_condition":
      return <Settings className="size-5 text-blue-600" />;
    default:
      return null;
  }
}
