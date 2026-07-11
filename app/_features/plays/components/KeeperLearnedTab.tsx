"use client";

import { useState, useTransition, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  Brain,
  Undo2,
  MessageCircle,
  ChevronDown,
  ChevronRight,
  Check,
  ExternalLink,
  X,
} from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
} from "@repo/ui";
import { cn } from "@repo/utils";
import type {
  SaltLearningRow,
  LearningsDigest,
} from "@/app/_features/me/actions/salt-learnings";
import {
  undoSaltLearning,
  markLearningsSeen,
} from "@/app/_features/me/actions/salt-learnings";
import { CorrectionModal } from "@/app/_features/me/components/CorrectionModal";
import type { KeeperEntityType } from "@/app/_features/plays/playbooks/evidence-accumulator";

type KeeperLearnedTabProps = {
  digest: LearningsDigest;
  workspaceId: string;
};

type EntityFilter = {
  entityType: string;
  entityId: string;
  entityName?: string;
};

function formatFieldLabel(fieldPath: string): string {
  return fieldPath
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
}

function formatEntityType(type: string): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function getEntityHref(entityType: string, entityId: string): string | null {
  switch (entityType) {
    case "person":
      return `/people/${entityId}`;
    case "organization":
      return `/orgs/${entityId}`;
    case "work":
      return `/work/${entityId}`;
    case "meeting":
      return `/meetings/${entityId}`;
    case "file":
      return `/files/${entityId}`;
    case "billing":
      return `/billing/${entityId}`;
    default:
      return null;
  }
}

function LearningCard({
  learning,
  onUndo,
  onExplain,
  isUndoing,
}: {
  learning: SaltLearningRow;
  onUndo: (_id: string) => void;
  onExplain: (_learning: SaltLearningRow) => void;
  isUndoing: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const entityHref = getEntityHref(learning.entity_type, learning.entity_id);

  return (
    <div
      className={cn(
        "group rounded-lg border bg-card p-4 transition-colors",
        !learning.seen_at && "border-primary/30 bg-primary/5"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {entityHref ? (
              <a
                href={entityHref}
                className="font-medium truncate hover:underline underline-offset-2"
              >
                {learning.entity_label}
              </a>
            ) : (
              <span className="font-medium truncate">{learning.entity_label}</span>
            )}
            <Badge variant="outline" className="text-xs shrink-0">
              {formatEntityType(learning.entity_type)}
            </Badge>
            {!learning.seen_at && (
              <Badge variant="default" className="text-xs shrink-0">
                New
              </Badge>
            )}
            {entityHref && (
              <a
                href={entityHref}
                className="text-muted-foreground hover:text-foreground transition-colors"
                title={`View ${learning.entity_label}`}
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Updated{" "}
            <span className="font-medium">{formatFieldLabel(learning.field_path)}</span>
            {" → "}
            <span className="font-medium text-foreground">
              {String(learning.new_value)}
            </span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {learning.evidence_summary} •{" "}
            {formatDistanceToNow(new Date(learning.created_at), { addSuffix: true })}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="h-8 px-2"
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t space-y-3">
          <div className="flex items-center gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Confidence:</span>{" "}
              <span className="font-medium">{learning.confidence}%</span>
            </div>
            {learning.old_value != null && (
              <div>
                <span className="text-muted-foreground">Was:</span>{" "}
                <span className="font-medium">{String(learning.old_value)}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onUndo(learning.id)}
              disabled={isUndoing}
            >
              <Undo2 className="h-3.5 w-3.5 mr-1.5" />
              Undo
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onExplain(learning)}>
              <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
              Tell Salt why...
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function LearningGroup({
  title,
  learnings,
  onUndo,
  onExplain,
  undoingId,
}: {
  title: string;
  learnings: SaltLearningRow[];
  onUndo: (_id: string) => void;
  onExplain: (_learning: SaltLearningRow) => void;
  undoingId: string | null;
}) {
  if (learnings.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      <div className="space-y-2">
        {learnings.map((learning) => (
          <LearningCard
            key={learning.id}
            learning={learning}
            onUndo={onUndo}
            onExplain={onExplain}
            isUndoing={undoingId === learning.id}
          />
        ))}
      </div>
    </div>
  );
}

export function KeeperLearnedTab({ digest, workspaceId }: KeeperLearnedTabProps) {
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [undoingId, setUndoingId] = useState<string | null>(null);
  const [localDigest, setLocalDigest] = useState(digest);
  const [correctionLearning, setCorrectionLearning] = useState<SaltLearningRow | null>(
    null
  );

  const entityFilter: EntityFilter | null = useMemo(() => {
    const entityType = searchParams.get("entity");
    const entityId = searchParams.get("entityId");
    if (entityType && entityId) {
      return { entityType, entityId };
    }
    return null;
  }, [searchParams]);

  const filteredDigest = useMemo(() => {
    if (!entityFilter) return localDigest;

    const filterLearnings = (learnings: SaltLearningRow[]) =>
      learnings.filter(
        (l) =>
          l.entity_type === entityFilter.entityType &&
          l.entity_id === entityFilter.entityId
      );

    return {
      ...localDigest,
      thisWeek: filterLearnings(localDigest.thisWeek),
      lastWeek: filterLearnings(localDigest.lastWeek),
      older: filterLearnings(localDigest.older),
      unseenCount: filterLearnings([
        ...localDigest.thisWeek,
        ...localDigest.lastWeek,
        ...localDigest.older,
      ]).filter((l) => !l.seen_at).length,
    };
  }, [localDigest, entityFilter]);

  const totalCount =
    filteredDigest.thisWeek.length + filteredDigest.lastWeek.length + filteredDigest.older.length;

  const entityName =
    entityFilter && filteredDigest.thisWeek[0]?.entity_label
      ? filteredDigest.thisWeek[0].entity_label
      : entityFilter && filteredDigest.lastWeek[0]?.entity_label
        ? filteredDigest.lastWeek[0].entity_label
        : entityFilter && filteredDigest.older[0]?.entity_label
          ? filteredDigest.older[0].entity_label
          : null;

  const handleUndo = (id: string) => {
    setUndoingId(id);
    startTransition(async () => {
      const result = await undoSaltLearning(id);
      if (result.success) {
        setLocalDigest((prev) => ({
          ...prev,
          unseenCount: Math.max(0, prev.unseenCount - 1),
          thisWeek: prev.thisWeek.filter((l) => l.id !== id),
          lastWeek: prev.lastWeek.filter((l) => l.id !== id),
          older: prev.older.filter((l) => l.id !== id),
        }));
      }
      setUndoingId(null);
    });
  };

  const handleExplain = (learning: SaltLearningRow) => {
    setCorrectionLearning(learning);
  };

  const handleCorrected = () => {
    if (correctionLearning) {
      setLocalDigest((prev) => ({
        ...prev,
        unseenCount: Math.max(0, prev.unseenCount - 1),
        thisWeek: prev.thisWeek.filter((l) => l.id !== correctionLearning.id),
        lastWeek: prev.lastWeek.filter((l) => l.id !== correctionLearning.id),
        older: prev.older.filter((l) => l.id !== correctionLearning.id),
      }));
    }
  };

  const handleMarkAllSeen = () => {
    startTransition(async () => {
      await markLearningsSeen(workspaceId);
      setLocalDigest((prev) => ({
        ...prev,
        unseenCount: 0,
        thisWeek: prev.thisWeek.map((l) => ({
          ...l,
          seen_at: new Date().toISOString(),
        })),
        lastWeek: prev.lastWeek.map((l) => ({
          ...l,
          seen_at: new Date().toISOString(),
        })),
        older: prev.older.map((l) => ({ ...l, seen_at: new Date().toISOString() })),
      }));
    });
  };

  if (totalCount === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Brain className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="font-medium mb-2">
            {entityFilter ? "No learnings for this record" : "No learnings yet"}
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {entityFilter ? (
              <>
                Keeper hasn&apos;t made any automatic updates to{" "}
                {entityName ?? "this record"} yet.{" "}
                <Link
                  href="/plays/players/keeper?tab=learned"
                  className="text-foreground underline underline-offset-2 hover:no-underline"
                >
                  View all learnings
                </Link>
              </>
            ) : (
              "When Keeper automatically updates Memory records based on accumulated evidence, those changes will appear here for transparency."
            )}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2 flex-wrap">
              <Brain className="h-5 w-5" />
              Evidence-Based Updates
              {filteredDigest.unseenCount > 0 && (
                <Badge variant="default" className="ml-2">
                  {filteredDigest.unseenCount} new
                </Badge>
              )}
              {entityFilter && (
                <Link
                  href="/plays/players/keeper?tab=learned"
                  className="inline-flex items-center gap-1 ml-2 px-2 py-0.5 rounded-full bg-muted text-xs font-medium text-muted-foreground hover:bg-muted/80 transition"
                >
                  Filtered: {entityName ?? formatEntityType(entityFilter.entityType)}
                  <X className="h-3 w-3" />
                </Link>
              )}
            </CardTitle>
            {filteredDigest.unseenCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllSeen}
                disabled={isPending}
              >
                <Check className="h-3.5 w-3.5 mr-1.5" />
                Mark all seen
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {entityFilter
              ? `Updates Keeper made to ${entityName ?? "this record"} based on accumulated evidence.`
              : "Updates Keeper made automatically based on accumulated evidence. You can undo any change or explain why it was wrong."}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <LearningGroup
            title="This Week"
            learnings={filteredDigest.thisWeek}
            onUndo={handleUndo}
            onExplain={handleExplain}
            undoingId={undoingId}
          />
          <LearningGroup
            title="Last Week"
            learnings={filteredDigest.lastWeek}
            onUndo={handleUndo}
            onExplain={handleExplain}
            undoingId={undoingId}
          />
          <LearningGroup
            title="Older"
            learnings={filteredDigest.older}
            onUndo={handleUndo}
            onExplain={handleExplain}
            undoingId={undoingId}
          />
        </CardContent>
      </Card>

      {correctionLearning && (
        <CorrectionModal
          open={!!correctionLearning}
          onOpenChange={(open) => !open && setCorrectionLearning(null)}
          learningId={correctionLearning.id}
          workspaceId={workspaceId}
          entityType={correctionLearning.entity_type as KeeperEntityType}
          entityId={correctionLearning.entity_id}
          entityLabel={correctionLearning.entity_label}
          fieldPath={correctionLearning.field_path}
          fieldLabel={correctionLearning.field_label ?? correctionLearning.field_path}
          wrongValue={correctionLearning.new_value}
          onCorrected={handleCorrected}
        />
      )}
    </div>
  );
}
