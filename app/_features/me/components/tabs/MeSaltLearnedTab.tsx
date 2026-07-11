"use client";

import { useState, useTransition } from "react";
import { formatDistanceToNow } from "date-fns";
import { Brain, Undo2, MessageCircle, ChevronDown, ChevronRight, Check } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
} from "@repo/ui";
import { cn } from "@repo/utils";
import type { SaltLearningRow, LearningsDigest } from "../../actions/salt-learnings";
import { undoSaltLearning, markLearningsSeen } from "../../actions/salt-learnings";
import { CorrectionModal } from "../CorrectionModal";
import type { KeeperEntityType } from "@/app/_features/plays/playbooks/evidence-accumulator";

type MeSaltLearnedTabProps = {
  digest: LearningsDigest;
  workspaceId: string;
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

function LearningCard({
  learning,
  workspaceId,
  onUndo,
  onExplain,
  isUndoing,
}: {
  learning: SaltLearningRow;
  workspaceId: string;
  onUndo: (id: string) => void;
  onExplain: (learning: SaltLearningRow) => void;
  isUndoing: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={cn(
        "group rounded-lg border bg-card p-4 transition-colors",
        !learning.seen_at && "border-primary/30 bg-primary/5",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium truncate">{learning.entity_label}</span>
            <Badge variant="outline" className="text-xs shrink-0">
              {formatEntityType(learning.entity_type)}
            </Badge>
            {!learning.seen_at && (
              <Badge variant="default" className="text-xs shrink-0">
                New
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Updated <span className="font-medium">{formatFieldLabel(learning.field_path)}</span>
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onExplain(learning)}
            >
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
  workspaceId,
  onUndo,
  onExplain,
  undoingId,
}: {
  title: string;
  learnings: SaltLearningRow[];
  workspaceId: string;
  onUndo: (id: string) => void;
  onExplain: (learning: SaltLearningRow) => void;
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
            workspaceId={workspaceId}
            onUndo={onUndo}
            onExplain={onExplain}
            isUndoing={undoingId === learning.id}
          />
        ))}
      </div>
    </div>
  );
}

export function MeSaltLearnedTab({ digest, workspaceId }: MeSaltLearnedTabProps) {
  const [isPending, startTransition] = useTransition();
  const [undoingId, setUndoingId] = useState<string | null>(null);
  const [localDigest, setLocalDigest] = useState(digest);
  const [correctionLearning, setCorrectionLearning] = useState<SaltLearningRow | null>(null);

  const totalCount =
    localDigest.thisWeek.length + localDigest.lastWeek.length + localDigest.older.length;

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
        thisWeek: prev.thisWeek.map((l) => ({ ...l, seen_at: new Date().toISOString() })),
        lastWeek: prev.lastWeek.map((l) => ({ ...l, seen_at: new Date().toISOString() })),
        older: prev.older.map((l) => ({ ...l, seen_at: new Date().toISOString() })),
      }));
    });
  };

  if (totalCount === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Brain className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="font-medium mb-2">No learnings yet</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            When Salt automatically updates your records based on accumulated evidence,
            those changes will appear here for transparency.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Salt Learned
              {localDigest.unseenCount > 0 && (
                <Badge variant="default" className="ml-2">
                  {localDigest.unseenCount} new
                </Badge>
              )}
            </CardTitle>
            {localDigest.unseenCount > 0 && (
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
            Changes Salt made automatically based on accumulated evidence.
            You can undo any change or explain why it was wrong.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <LearningGroup
            title="This Week"
            learnings={localDigest.thisWeek}
            workspaceId={workspaceId}
            onUndo={handleUndo}
            onExplain={handleExplain}
            undoingId={undoingId}
          />
          <LearningGroup
            title="Last Week"
            learnings={localDigest.lastWeek}
            workspaceId={workspaceId}
            onUndo={handleUndo}
            onExplain={handleExplain}
            undoingId={undoingId}
          />
          <LearningGroup
            title="Older"
            learnings={localDigest.older}
            workspaceId={workspaceId}
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
