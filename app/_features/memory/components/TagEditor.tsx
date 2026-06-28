"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { Check, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Badge, Input, Button } from "@repo/ui";
import { cn } from "@repo/utils";
import {
  getTags,
  getEntityTags,
  assignTag,
  unassignTag,
  createTag,
  type WorkspaceTag,
  type TagAssignment,
  type TagScope,
} from "@/app/_features/memory/tags";
import { getTagBadgeClasses, getTagPillClasses } from "@/app/_features/memory/tags/tag-styles";

interface TagEditorProps {
  entityType: "person" | "org" | "work";
  entityId: string;
  scope?: TagScope;
  className?: string;
  disabled?: boolean;
}

export function TagEditor({
  entityType,
  entityId,
  scope,
  className,
  disabled = false,
}: TagEditorProps) {
  const [isPending, startTransition] = useTransition();
  const [availableTags, setAvailableTags] = useState<WorkspaceTag[]>([]);
  const [assignments, setAssignments] = useState<TagAssignment[]>([]);
  const [newTagValue, setNewTagValue] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const loadTags = useCallback(async () => {
    setIsLoading(true);
    try {
      const [tagsResult, assignmentsResult] = await Promise.all([
        getTags({ scope: scope ?? entityType }),
        getEntityTags(entityType, entityId),
      ]);

      if (tagsResult.success) {
        setAvailableTags(tagsResult.data);
      } else if (tagsResult.error) {
        toast.error(tagsResult.error);
      }
      if (assignmentsResult.success) {
        setAssignments(assignmentsResult.data);
      } else if (assignmentsResult.error) {
        toast.error(assignmentsResult.error);
      }
    } catch {
      console.error("Failed to load tags");
      toast.error("Failed to load tags");
    } finally {
      setIsLoading(false);
    }
  }, [entityType, entityId, scope]);

  useEffect(() => {
    loadTags();
  }, [loadTags]);

  const assignedTagIds = new Set(assignments.map((a) => a.tagId));

  const assignTagToEntity = async (tag: WorkspaceTag) => {
    const result = await assignTag({
      entityType,
      entityId,
      tagId: tag.id,
      source: "manual",
    });

    if (result.success) {
      if (result.assignment) {
        setAssignments((prev) => [...prev, result.assignment!]);
      }
    } else {
      toast.error(result.error ?? "Failed to assign tag");
    }
  };

  const handleToggleTag = (tag: WorkspaceTag) => {
    if (disabled || isPending) return;

    if (assignedTagIds.has(tag.id)) {
      startTransition(async () => {
        const result = await unassignTag(entityType, entityId, tag.id);

        if (result.success) {
          setAssignments((prev) => prev.filter((a) => a.tagId !== tag.id));
        } else {
          toast.error(result.error ?? "Failed to remove tag");
        }
      });
      return;
    }

    startTransition(() => assignTagToEntity(tag));
  };

  const handleCreateTag = () => {
    const label = newTagValue.trim();
    if (!label) return;

    const exists = availableTags.some((t) => t.label.toLowerCase() === label.toLowerCase());
    if (exists) {
      const existing = availableTags.find((t) => t.label.toLowerCase() === label.toLowerCase());
      if (existing && !assignedTagIds.has(existing.id)) {
        startTransition(() => assignTagToEntity(existing));
      }
      setNewTagValue("");
      return;
    }

    startTransition(async () => {
      const result = await createTag({
        label,
        scope: scope ?? "all",
        category: "custom",
      });

      if (result.success && result.tag) {
        setAvailableTags((prev) => [...prev, result.tag!]);
        await assignTagToEntity(result.tag);
        setNewTagValue("");
      } else {
        toast.error(result.error ?? "Failed to create tag");
      }
    });
  };

  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading tags...</span>
      </div>
    );
  }

  if (disabled) {
    if (assignments.length === 0) {
      return <span className="text-sm text-muted-foreground">No tags</span>;
    }

    return (
      <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
        {assignments.map((assignment) => {
          const tag = assignment.tag ?? availableTags.find((t) => t.id === assignment.tagId);
          if (!tag) return null;

          return (
            <Badge
              key={assignment.id}
              variant="secondary"
              className={cn(
                getTagBadgeClasses(tag),
                assignment.source === "keeper" && "border-dashed border-primary/30"
              )}
            >
              {tag.label}
              {assignment.source === "keeper" && (
                <span className="ml-1 text-[10px] text-muted-foreground">Salt</span>
              )}
            </Badge>
          );
        })}
      </div>
    );
  }

  const orphanAssignments = assignments.filter(
    (assignment) => !availableTags.some((tag) => tag.id === assignment.tagId)
  );

  const assignedTags = availableTags.filter((tag) => assignedTagIds.has(tag.id));
  const unassignedTags = availableTags.filter((tag) => !assignedTagIds.has(tag.id));
  const hasApplied = assignedTags.length > 0 || orphanAssignments.length > 0;

  function renderTagButton(tag: WorkspaceTag, isAssigned: boolean) {
    const assignment = assignments.find((a) => a.tagId === tag.id);
    const isKeeper = assignment?.source === "keeper";

    return (
      <button
        key={tag.id}
        type="button"
        disabled={isPending}
        aria-pressed={isAssigned}
        onClick={() => handleToggleTag(tag)}
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition",
          getTagPillClasses(tag, isAssigned),
          isKeeper && isAssigned && "border-dashed",
        )}
      >
        {isAssigned ? <Check className="size-3 shrink-0" strokeWidth={2.5} /> : null}
        <span>{tag.label}</span>
        {isKeeper ? <span className="text-[10px] opacity-70">Salt</span> : null}
      </button>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {hasApplied ? (
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Applied
          </p>
          <div className="flex flex-wrap gap-1.5">
            {orphanAssignments.map((assignment) => {
              const tag = assignment.tag ?? availableTags.find((t) => t.id === assignment.tagId);
              if (!tag) return null;

              return (
                <Badge
                  key={assignment.id}
                  variant="secondary"
                  className={cn(
                    "gap-1",
                    getTagBadgeClasses(tag),
                    assignment.source === "keeper" && "border-dashed border-primary/30",
                  )}
                >
                  <Check className="size-3" strokeWidth={2.5} />
                  <span>{tag.label}</span>
                  {assignment.source === "keeper" && (
                    <span className="text-[10px] text-muted-foreground">Salt</span>
                  )}
                </Badge>
              );
            })}
            {assignedTags.map((tag) => renderTagButton(tag, true))}
          </div>
        </div>
      ) : null}

      {unassignedTags.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            {hasApplied ? "Add more" : "Available"}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {unassignedTags.map((tag) => renderTagButton(tag, false))}
          </div>
        </div>
      ) : null}

      {availableTags.length === 0 && orphanAssignments.length === 0 ? (
        <span className="text-sm text-muted-foreground">No tags yet.</span>
      ) : null}

      <div className="flex items-center gap-2 border-t border-border/40 pt-3">
        <div className="relative flex-1 max-w-xs">
          <Plus
            className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
            strokeWidth={2}
          />
          <Input
            value={newTagValue}
            onChange={(event) => setNewTagValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleCreateTag();
              }
            }}
            placeholder="Create new tag..."
            disabled={isPending}
            className="h-8 pl-8 text-sm"
          />
        </div>
        {newTagValue.trim() ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={isPending}
            onClick={handleCreateTag}
            className="h-8"
          >
            {isPending ? <Loader2 className="size-3.5 animate-spin" /> : "Add"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

interface TagDisplayProps {
  tags: Array<{ id: string; label: string; source?: "manual" | "keeper" | "system" }>;
  className?: string;
}

export function TagDisplay({ tags, className }: TagDisplayProps) {
  if (tags.length === 0) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      {tags.map((tag) => (
        <Badge
          key={tag.id}
          variant="secondary"
          className={cn(tag.source === "keeper" && "border-dashed border-primary/30")}
        >
          {tag.label}
          {tag.source === "keeper" && (
            <span className="ml-1 text-[10px] text-muted-foreground">Salt</span>
          )}
        </Badge>
      ))}
    </div>
  );
}
