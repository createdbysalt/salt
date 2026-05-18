"use client";

import * as React from "react";
import {
  User as UserIcon,
  Building2,
  Briefcase,
  Zap,
  CheckCircle2,
  Pencil,
  Sparkles,
  AlertCircle,
  ChevronDown,
} from "lucide-react";
import { Button, Card, Input } from "@repo/ui";
import { cn } from "@repo/utils";

/**
 * ExtractionPreview — Shows AI-extracted entities with editable fields.
 *
 * Part of the "Progressive Autonomy" pattern:
 * - New users see this preview before entities are created
 * - Established users (>50 captures, >90% accuracy) can skip to auto-create
 *
 * Research-backed: ShapeofAI "show what AI understood", MightyBot autonomy framework
 */

export type ExtractedEntity = {
  id: string;
  type: "person" | "organization" | "project" | "action" | "note";
  value: string;
  confidence: "high" | "medium" | "low";
  isNew: boolean;
  matchedTo?: { id: string; name: string }; // If matched to existing entity
  alternatives?: Array<{ id: string; name: string }>; // For disambiguation
  extractedFields?: Record<string, string>; // Additional fields (budget, date, etc.)
};

interface ExtractionPreviewProps {
  content: string;
  entities: ExtractedEntity[];
  onConfirm: (entities: ExtractedEntity[]) => void;
  onSkip: () => void;
  isProcessing?: boolean;
}

export function ExtractionPreview({
  content,
  entities,
  onConfirm,
  onSkip,
  isProcessing = false,
}: ExtractionPreviewProps) {
  const [editedEntities, setEditedEntities] = React.useState(entities);
  const [editingId, setEditingId] = React.useState<string | null>(null);

  const handleEntityChange = (id: string, value: string) => {
    setEditedEntities((prev) =>
      prev.map((e) => (e.id === id ? { ...e, value } : e))
    );
  };

  const handleSelectAlternative = (entityId: string, alternative: { id: string; name: string }) => {
    setEditedEntities((prev) =>
      prev.map((e) =>
        e.id === entityId
          ? { ...e, value: alternative.name, matchedTo: alternative, isNew: false }
          : e
      )
    );
  };

  const handleConfirm = () => {
    onConfirm(editedEntities);
  };

  return (
    <Card className="overflow-hidden mb-6 border-primary/30 bg-primary/5 animate-in fade-in slide-in-from-top-1 duration-200">
      {/* Header */}
      <div className="px-5 py-4 border-b border-primary/15">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="size-4 text-primary animate-pulse" />
          <span className="text-foreground">
            {isProcessing ? "Filing this for you…" : "Ready to create"}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
          "{content}"
        </p>
      </div>

      {/* Extracted entities */}
      <div className="p-5 space-y-3">
        {editedEntities.map((entity) => (
          <EntityRow
            key={entity.id}
            entity={entity}
            isEditing={editingId === entity.id}
            onEdit={() => setEditingId(entity.id)}
            onSave={() => setEditingId(null)}
            onChange={(value) => handleEntityChange(entity.id, value)}
            onSelectAlternative={(alt) => handleSelectAlternative(entity.id, alt)}
          />
        ))}
      </div>

      {/* Actions */}
      <div className="px-5 py-3 border-t border-primary/15 bg-primary/[0.02] flex items-center justify-between">
        <button
          type="button"
          onClick={onSkip}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Skip
        </button>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground/60 hidden sm:inline">
            ↵ to create
          </span>
          <Button size="sm" onClick={handleConfirm} className="h-7 gap-1.5">
            <CheckCircle2 className="size-3.5" />
            Create All
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ============================================================================
// ENTITY ROW
// ============================================================================

function EntityRow({
  entity,
  isEditing,
  onEdit,
  onSave,
  onChange,
  onSelectAlternative,
}: {
  entity: ExtractedEntity;
  isEditing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onChange: (value: string) => void;
  onSelectAlternative: (alt: { id: string; name: string }) => void;
}) {
  const meta = entityMeta(entity.type);
  const hasAlternatives = entity.alternatives && entity.alternatives.length > 0;
  const [showAlternatives, setShowAlternatives] = React.useState(false);

  return (
    <div className="animate-in fade-in slide-in-from-left-1 duration-300">
      <div className="flex items-center gap-3">
        {/* Icon */}
        <div
          className={cn(
            "flex items-center justify-center size-7 rounded-md shrink-0",
            meta.bg,
            meta.fg
          )}
        >
          <meta.Icon className="size-3.5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <Input
              value={entity.value}
              onChange={(e) => onChange(e.target.value)}
              onBlur={onSave}
              onKeyDown={(e) => e.key === "Enter" && onSave()}
              className="h-7 text-sm"
              autoFocus
            />
          ) : (
            <div className="flex items-center gap-2">
              <p className="text-sm leading-tight">
                <span className="text-muted-foreground">{meta.label}:</span>{" "}
                <span className="font-medium">{entity.value}</span>
                {entity.isNew && (
                  <span className="ml-1.5 text-[10px] text-primary font-medium">(new)</span>
                )}
              </p>
            </div>
          )}
        </div>

        {/* Confidence + Edit */}
        <div className="flex items-center gap-1.5 shrink-0">
          <ConfidenceIndicator confidence={entity.confidence} />

          {hasAlternatives ? (
            <button
              type="button"
              onClick={() => setShowAlternatives(!showAlternatives)}
              className="p-1 rounded hover:bg-foreground/5 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Show alternatives"
            >
              <ChevronDown className={cn("size-3.5 transition-transform", showAlternatives && "rotate-180")} />
            </button>
          ) : (
            <button
              type="button"
              onClick={onEdit}
              className="p-1 rounded hover:bg-foreground/5 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Edit"
            >
              <Pencil className="size-3.5" />
            </button>
          )}

          <CheckCircle2 className="size-4 text-success shrink-0" />
        </div>
      </div>

      {/* Alternatives dropdown */}
      {showAlternatives && entity.alternatives && (
        <div className="ml-10 mt-2 space-y-1 animate-in fade-in slide-in-from-top-1 duration-150">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">
            Did you mean?
          </p>
          {entity.alternatives.map((alt) => (
            <button
              key={alt.id}
              type="button"
              onClick={() => {
                onSelectAlternative(alt);
                setShowAlternatives(false);
              }}
              className="w-full text-left px-2 py-1.5 rounded text-xs hover:bg-muted/50 transition-colors"
            >
              {alt.name}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowAlternatives(false)}
            className="w-full text-left px-2 py-1.5 rounded text-xs text-muted-foreground hover:bg-muted/50 transition-colors"
          >
            Keep as new: {entity.value}
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// CONFIDENCE INDICATOR
// ============================================================================

function ConfidenceIndicator({ confidence }: { confidence: "high" | "medium" | "low" }) {
  if (confidence === "high") return null; // High confidence = no indicator needed

  return (
    <div
      className={cn(
        "flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px]",
        confidence === "medium" && "bg-warning/10 text-warning",
        confidence === "low" && "bg-destructive/10 text-destructive"
      )}
    >
      <AlertCircle className="size-3" />
      <span>{confidence === "medium" ? "Check" : "Uncertain"}</span>
    </div>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function entityMeta(entityType: ExtractedEntity["type"]) {
  switch (entityType) {
    case "person":
      return {
        Icon: UserIcon,
        bg: "bg-muted",
        fg: "text-foreground",
        label: "Person",
      };
    case "organization":
      return {
        Icon: Building2,
        bg: "bg-muted",
        fg: "text-foreground",
        label: "Organization",
      };
    case "project":
      return {
        Icon: Briefcase,
        bg: "bg-muted",
        fg: "text-foreground",
        label: "Project",
      };
    case "action":
      return {
        Icon: Zap,
        bg: "bg-muted",
        fg: "text-foreground",
        label: "Action",
      };
    case "note":
      return {
        Icon: Sparkles,
        bg: "bg-muted",
        fg: "text-foreground",
        label: "Note",
      };
  }
}
