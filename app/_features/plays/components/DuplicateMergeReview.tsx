"use client";

import { useState } from "react";
import { Button, Badge, Card, CardHeader, CardTitle, CardContent } from "@repo/ui";
import { Check, X, ArrowRight, GitMerge, AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@repo/utils";
import type { CompareDuplicatesResult, FieldComparison } from "@/app/_lib/memory-tools";

interface DuplicateMergeReviewProps {
  comparison: CompareDuplicatesResult;
  onMerge: (winnerId: string, fieldOverrides?: Record<string, unknown>) => Promise<void>;
  onDismiss: () => void;
}

export function DuplicateMergeReview({
  comparison,
  onMerge,
  onDismiss,
}: DuplicateMergeReviewProps) {
  const [merging, setMerging] = useState(false);
  const [fieldOverrides, setFieldOverrides] = useState<Record<string, unknown>>({});

  const winnerId = comparison.suggestedWinner === "a"
    ? comparison.recordA.id
    : comparison.recordB.id;

  async function handleMerge() {
    setMerging(true);
    try {
      await onMerge(winnerId, fieldOverrides);
    } finally {
      setMerging(false);
    }
  }

  function toggleFieldOverride(field: string, value: unknown) {
    setFieldOverrides((prev) => {
      const next = { ...prev };
      if (next[field] === value) {
        delete next[field];
      } else {
        next[field] = value;
      }
      return next;
    });
  }

  return (
    <Card className="border-amber-200 dark:border-amber-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitMerge className="size-5 text-amber-600" />
            <CardTitle className="text-base">Potential Duplicate Found</CardTitle>
          </div>
          <Badge variant="outline" className="text-amber-600 border-amber-200">
            {comparison.winnerReason}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Side-by-side comparison header */}
        <div className="grid grid-cols-[1fr,auto,1fr] gap-4 text-sm">
          <div className="font-medium text-center">
            {comparison.recordA.name}
            {comparison.suggestedWinner === "a" && (
              <Badge variant="secondary" className="ml-2 text-xs">
                Suggested
              </Badge>
            )}
          </div>
          <div className="w-8" />
          <div className="font-medium text-center">
            {comparison.recordB.name}
            {comparison.suggestedWinner === "b" && (
              <Badge variant="secondary" className="ml-2 text-xs">
                Suggested
              </Badge>
            )}
          </div>
        </div>

        {/* Field comparisons */}
        <div className="space-y-2">
          {comparison.fields.map((field) => (
            <FieldComparisonRow
              key={field.field}
              field={field}
              selectedOverride={fieldOverrides[field.field]}
              onOverrideSelect={(value) => toggleFieldOverride(field.field, value)}
            />
          ))}
        </div>

        {/* Merge preview */}
        {comparison.mergePreview && (
          <div className="p-3 rounded-lg bg-muted/50 space-y-2">
            <div className="text-xs font-medium text-muted-foreground uppercase">
              Merge Preview
            </div>
            <div className="text-sm space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Fields to merge:</span>
                <span>{Object.keys(comparison.mergePreview).length}</span>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            disabled={merging}
          >
            <X className="size-4 mr-1" />
            Not a duplicate
          </Button>
          <Button
            size="sm"
            onClick={handleMerge}
            disabled={merging}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {merging ? (
              <Loader2 className="size-4 mr-1 animate-spin" />
            ) : (
              <GitMerge className="size-4 mr-1" />
            )}
            Merge Records
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface FieldComparisonRowProps {
  field: FieldComparison;
  selectedOverride: unknown;
  onOverrideSelect: (value: unknown) => void;
}

function FieldComparisonRow({
  field,
  selectedOverride,
  onOverrideSelect,
}: FieldComparisonRowProps) {
  const isIdentical = field.match === "identical";
  const isDifferent = field.match === "different";
  const isAOnly = field.match === "a_only";
  const isBOnly = field.match === "b_only";

  return (
    <div
      className={cn(
        "grid grid-cols-[1fr,auto,1fr] gap-4 p-2 rounded-lg text-sm",
        isIdentical && "bg-emerald-50 dark:bg-emerald-950/30",
        isDifferent && "bg-amber-50 dark:bg-amber-950/30",
        (isAOnly || isBOnly) && "bg-muted/30"
      )}
    >
      {/* Value A */}
      <button
        type="button"
        onClick={() => field.valueA !== undefined && onOverrideSelect(field.valueA)}
        className={cn(
          "text-left p-2 rounded transition-colors",
          selectedOverride === field.valueA && "ring-2 ring-primary",
          field.suggestedSource === "a" && !selectedOverride && "bg-primary/10",
          field.valueA === undefined && "text-muted-foreground italic"
        )}
        disabled={field.valueA === undefined}
      >
        {formatFieldValue(field.valueA)}
      </button>

      {/* Field name and match indicator */}
      <div className="flex flex-col items-center justify-center gap-1 w-24">
        <span className="text-xs font-medium text-muted-foreground">
          {formatFieldName(field.field)}
        </span>
        <MatchIndicator match={field.match} />
      </div>

      {/* Value B */}
      <button
        type="button"
        onClick={() => field.valueB !== undefined && onOverrideSelect(field.valueB)}
        className={cn(
          "text-left p-2 rounded transition-colors",
          selectedOverride === field.valueB && "ring-2 ring-primary",
          field.suggestedSource === "b" && !selectedOverride && "bg-primary/10",
          field.valueB === undefined && "text-muted-foreground italic"
        )}
        disabled={field.valueB === undefined}
      >
        {formatFieldValue(field.valueB)}
      </button>
    </div>
  );
}

function MatchIndicator({ match }: { match: FieldComparison["match"] }) {
  switch (match) {
    case "identical":
      return (
        <Badge variant="outline" className="text-emerald-600 border-emerald-200 text-xs">
          <Check className="size-3 mr-1" />
          Match
        </Badge>
      );
    case "different":
      return (
        <Badge variant="outline" className="text-amber-600 border-amber-200 text-xs">
          <AlertTriangle className="size-3 mr-1" />
          Different
        </Badge>
      );
    case "a_only":
      return (
        <Badge variant="outline" className="text-muted-foreground text-xs">
          <ArrowRight className="size-3 mr-1 rotate-180" />
          A only
        </Badge>
      );
    case "b_only":
      return (
        <Badge variant="outline" className="text-muted-foreground text-xs">
          <ArrowRight className="size-3 mr-1" />
          B only
        </Badge>
      );
    default:
      return null;
  }
}

function formatFieldName(field: string): string {
  return field
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatFieldValue(value: unknown): string {
  if (value === undefined || value === null) return "—";
  if (typeof value === "string") return value || "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return value.toLocaleString();
  if (Array.isArray(value)) return value.join(", ") || "—";
  return JSON.stringify(value);
}
