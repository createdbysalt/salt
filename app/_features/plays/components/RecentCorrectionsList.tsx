import { ArrowRight } from "lucide-react";

interface Correction {
  id: string;
  entityType: string;
  field: string;
  originalValue: unknown;
  correctedValue: unknown;
  correctedAt: string;
}

interface RecentCorrectionsListProps {
  corrections: Correction[];
}

export function RecentCorrectionsList({ corrections }: RecentCorrectionsListProps) {
  return (
    <div className="space-y-3">
      {corrections.map((correction) => (
        <div
          key={correction.id}
          className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground uppercase">
                {correction.entityType}
              </span>
              <span className="font-mono text-sm">{correction.field}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-red-600 line-through">
                {formatValue(correction.originalValue)}
              </span>
              <ArrowRight className="size-3 text-muted-foreground" />
              <span className="text-emerald-600">
                {formatValue(correction.correctedValue)}
              </span>
            </div>
          </div>
          <span className="text-xs text-muted-foreground">
            {formatRelativeTime(correction.correctedAt)}
          </span>
        </div>
      ))}
    </div>
  );
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "empty";
  if (typeof value === "string") return value || "empty";
  return JSON.stringify(value);
}

function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}
