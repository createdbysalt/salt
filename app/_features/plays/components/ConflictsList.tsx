"use client";

import { useState } from "react";
import { Button, Badge } from "@repo/ui";
import { Check, X } from "lucide-react";
import type { FieldConflict, ConflictCandidate } from "@/app/_lib/memory-tools";
import { resolveConflictAction } from "../actions";

interface ConflictsListProps {
  conflicts: FieldConflict[];
}

export function ConflictsList({ conflicts }: ConflictsListProps) {
  return (
    <div className="space-y-4">
      {conflicts.map((conflict) => (
        <ConflictItem key={conflict.id} conflict={conflict} />
      ))}
    </div>
  );
}

function ConflictItem({ conflict }: { conflict: FieldConflict }) {
  const [resolving, setResolving] = useState(false);
  const [resolved, setResolved] = useState(false);

  async function handleResolve(value: unknown) {
    setResolving(true);
    try {
      await resolveConflictAction({
        conflictId: conflict.id,
        resolutionValue: value,
      });
      setResolved(true);
    } finally {
      setResolving(false);
    }
  }

  if (resolved) {
    return (
      <div className="p-4 rounded-lg border bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800">
        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
          <Check className="size-4" />
          <span className="text-sm font-medium">Resolved</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-lg border space-y-3">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground uppercase">
              {conflict.entityType}
            </span>
            <span className="font-mono text-sm">{conflict.field}</span>
          </div>
          <ConflictTypeBadge type={conflict.conflictType} />
        </div>
        <span className="text-xs text-muted-foreground">
          {formatRelativeTime(conflict.detectedAt)}
        </span>
      </div>

      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Salt found conflicting evidence. Which value is correct?
        </p>
        <div className="flex flex-wrap gap-2">
          {conflict.candidates.map((candidate, index) => (
            <CandidateButton
              key={index}
              candidate={candidate}
              onSelect={() => handleResolve(candidate.value)}
              disabled={resolving}
            />
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleResolve(null)}
            disabled={resolving}
            className="text-muted-foreground"
          >
            <X className="size-3 mr-1" />
            Neither
          </Button>
        </div>
      </div>
    </div>
  );
}

function CandidateButton({
  candidate,
  onSelect,
  disabled,
}: {
  candidate: ConflictCandidate;
  onSelect: () => void;
  disabled: boolean;
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onSelect}
      disabled={disabled}
      className="gap-2"
    >
      <span>{formatValue(candidate.value)}</span>
      <span className="text-xs text-muted-foreground">
        ({candidate.confidence}%)
      </span>
    </Button>
  );
}

function ConflictTypeBadge({ type }: { type: FieldConflict["conflictType"] }) {
  switch (type) {
    case "value_split":
      return (
        <Badge variant="outline" className="text-amber-600 border-amber-200">
          Evidence split
        </Badge>
      );
    case "source_disagree":
      return (
        <Badge variant="outline" className="text-orange-600 border-orange-200">
          Sources disagree
        </Badge>
      );
    case "user_vs_system":
      return (
        <Badge variant="outline" className="text-blue-600 border-blue-200">
          You vs Salt
        </Badge>
      );
    case "recency_unclear":
      return (
        <Badge variant="outline" className="text-gray-600 border-gray-200">
          Timing unclear
        </Badge>
      );
    default:
      return null;
  }
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
