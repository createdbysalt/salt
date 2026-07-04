"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronUp, ChevronDown, Plus, X, MoreHorizontal, Loader2, ListTodo, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui";
import { cn } from "@repo/utils";
import type { AgendaItem, AgendaMode } from "../utils/agenda-templates";
import { AGENDA_TEMPLATES } from "../utils/agenda-templates";
import {
  initializeAgenda,
  addAgendaItem,
  updateAgendaItem,
  removeAgendaItem,
  reorderAgendaItems,
  resetAgendaToTemplate,
  clearAgenda,
} from "../actions/agenda";

const formLabelClass =
  "text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground";

interface AgendaItemRowProps {
  item: AgendaItem;
  index: number;
  total: number;
  onUpdate: (updates: { title?: string; notes?: string }) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isLoading: boolean;
}

function AgendaItemRow({
  item,
  index,
  total,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  isLoading,
}: AgendaItemRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState(item.title);
  const [notes, setNotes] = useState(item.notes);
  const titleRef = useRef<HTMLInputElement>(null);

  const handleTitleBlur = () => {
    if (title !== item.title) {
      onUpdate({ title });
    }
  };

  const handleNotesBlur = () => {
    if (notes !== item.notes) {
      onUpdate({ notes });
    }
  };

  return (
    <div className="group py-3">
      <div className="flex items-center gap-2">
        <span className="w-5 shrink-0 text-center text-xs font-medium text-muted-foreground/60">
          {index + 1}.
        </span>

        <input
          ref={titleRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.currentTarget.blur();
            }
          }}
          placeholder="Agenda item..."
          disabled={isLoading}
          className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none disabled:opacity-50"
        />

        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={index === 0 || isLoading}
            className="flex size-6 items-center justify-center rounded text-muted-foreground/60 transition hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
            title="Move up"
          >
            <ChevronUp className="size-3.5" strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={index === total - 1 || isLoading}
            className="flex size-6 items-center justify-center rounded text-muted-foreground/60 transition hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
            title="Move down"
          >
            <ChevronDown className="size-3.5" strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className={cn(
              "flex size-6 items-center justify-center rounded text-muted-foreground/60 transition hover:bg-muted hover:text-foreground",
              (expanded || notes) && "text-foreground/80"
            )}
            title={expanded ? "Hide notes" : "Add notes"}
          >
            <MoreHorizontal className="size-3.5" strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={onRemove}
            disabled={isLoading}
            className="flex size-6 items-center justify-center rounded text-muted-foreground/60 transition hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
            title="Remove"
          >
            {isLoading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <X className="size-3.5" strokeWidth={2} />
            )}
          </button>
        </div>
      </div>

      {(expanded || notes) && (
        <div className="mt-2 pl-7">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={handleNotesBlur}
            placeholder="Add notes for this item..."
            disabled={isLoading}
            rows={2}
            className="w-full resize-none rounded-lg border border-border/40 bg-muted/30 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-foreground/30 focus:outline-none disabled:opacity-50"
          />
        </div>
      )}
    </div>
  );
}

interface ModeSelectionProps {
  meetingType: string | null | undefined;
  onSelect: (mode: AgendaMode) => void;
  isLoading: boolean;
}

function ModeSelection({ meetingType, onSelect, isLoading }: ModeSelectionProps) {
  const templateKey = meetingType?.toLowerCase() ?? "other";
  const templateItems = AGENDA_TEMPLATES[templateKey] ?? AGENDA_TEMPLATES.other;

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => onSelect("template")}
        disabled={isLoading}
        className="flex w-full flex-col gap-2 rounded-xl border border-border/60 bg-card/40 p-4 text-left transition hover:border-foreground/20 hover:bg-card/60 disabled:opacity-50"
      >
        <div className="flex items-center gap-2">
          <ListTodo className="size-4 text-muted-foreground" strokeWidth={1.75} />
          <span className="text-sm font-medium text-foreground">Use template</span>
          {meetingType && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium capitalize text-muted-foreground">
              {meetingType}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {templateItems.slice(0, 3).join(", ")}
          {templateItems.length > 3 && `, +${templateItems.length - 3} more`}
        </p>
      </button>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onSelect("custom")}
          disabled={isLoading}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-dashed border-border/60 py-3 text-xs text-muted-foreground transition hover:border-foreground/20 hover:text-foreground disabled:opacity-50"
        >
          <Plus className="size-3.5" strokeWidth={2.25} />
          Custom agenda
        </button>

        <button
          type="button"
          onClick={() => onSelect("none")}
          disabled={isLoading}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-dashed border-border/60 py-3 text-xs text-muted-foreground transition hover:border-foreground/20 hover:text-foreground disabled:opacity-50"
        >
          No agenda
        </button>
      </div>
    </div>
  );
}

interface MeetingAgendaCardProps {
  meetingId: string;
  meetingType: string | null | undefined;
  agenda: AgendaItem[] | null;
}

export function MeetingAgendaCard({
  meetingId,
  meetingType,
  agenda: initialAgenda,
}: MeetingAgendaCardProps) {
  const [agenda, setAgenda] = useState<AgendaItem[] | null>(initialAgenda);
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [globalLoading, setGlobalLoading] = useState(false);
  const [showTypeChangePrompt, setShowTypeChangePrompt] = useState(false);
  const prevMeetingTypeRef = useRef(meetingType);

  const isInitialized = agenda !== null;
  const isEmpty = agenda?.length === 0;

  // Detect meeting type changes and prompt to reset agenda
  useEffect(() => {
    const prevType = prevMeetingTypeRef.current;
    const hasTypeChanged = prevType !== meetingType && prevType !== undefined;
    const hasAgendaItems = agenda !== null && agenda.length > 0;

    if (hasTypeChanged && hasAgendaItems) {
      setShowTypeChangePrompt(true);
    }

    prevMeetingTypeRef.current = meetingType;
  }, [meetingType, agenda]);

  const handleModeSelect = async (mode: AgendaMode) => {
    setGlobalLoading(true);
    const result = await initializeAgenda(meetingId, mode, meetingType);
    setGlobalLoading(false);

    if (result.success) {
      setAgenda(result.agenda);
      toast.success(
        mode === "template"
          ? "Agenda created from template"
          : mode === "custom"
            ? "Custom agenda started"
            : "No agenda set"
      );
    } else {
      toast.error(result.error);
    }
  };

  const handleAddItem = async () => {
    setGlobalLoading(true);
    const result = await addAgendaItem(meetingId);
    setGlobalLoading(false);

    if (result.success) {
      setAgenda(result.agenda);
    } else {
      toast.error(result.error);
    }
  };

  const handleUpdateItem = async (itemId: string, updates: { title?: string; notes?: string }) => {
    setLoadingIds((prev) => new Set([...prev, itemId]));
    const result = await updateAgendaItem(meetingId, itemId, updates);
    setLoadingIds((prev) => {
      const next = new Set(prev);
      next.delete(itemId);
      return next;
    });

    if (result.success) {
      setAgenda(result.agenda);
    } else {
      toast.error(result.error);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    setLoadingIds((prev) => new Set([...prev, itemId]));
    const result = await removeAgendaItem(meetingId, itemId);
    setLoadingIds((prev) => {
      const next = new Set(prev);
      next.delete(itemId);
      return next;
    });

    if (result.success) {
      setAgenda(result.agenda);
      toast.success("Item removed");
    } else {
      toast.error(result.error);
    }
  };

  const handleReorder = async (fromIndex: number, direction: "up" | "down") => {
    if (!agenda) return;

    const toIndex = direction === "up" ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= agenda.length) return;

    const newOrder = [...agenda];
    const [moved] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, moved);

    const itemIds = newOrder.map((item) => item.id);

    setGlobalLoading(true);
    const result = await reorderAgendaItems(meetingId, itemIds);
    setGlobalLoading(false);

    if (result.success) {
      setAgenda(result.agenda);
    } else {
      toast.error(result.error);
    }
  };

  const handleResetToTemplate = async () => {
    setGlobalLoading(true);
    const result = await resetAgendaToTemplate(meetingId, meetingType);
    setGlobalLoading(false);

    if (result.success) {
      setAgenda(result.agenda);
      toast.success("Reset to template");
    } else {
      toast.error(result.error);
    }
  };

  const handleClear = async () => {
    setGlobalLoading(true);
    const result = await clearAgenda(meetingId);
    setGlobalLoading(false);

    if (result.success) {
      setAgenda(result.agenda);
      toast.success("Agenda cleared");
    } else {
      toast.error(result.error);
    }
  };

  const handleTypeChangeReset = async () => {
    setShowTypeChangePrompt(false);
    await handleResetToTemplate();
  };

  const handleTypeChangeDismiss = () => {
    setShowTypeChangePrompt(false);
  };

  const templateName = meetingType || "Other";

  return (
    <div className="space-y-3">
      {showTypeChangePrompt && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-sky/30 bg-sky/5 px-4 py-3">
          <p className="text-xs text-foreground">
            Reset agenda to <span className="font-medium capitalize">{templateName}</span> template?
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={handleTypeChangeDismiss}
              disabled={globalLoading}
              className="text-xs text-muted-foreground transition hover:text-foreground"
            >
              Keep current
            </button>
            <Button
              size="sm"
              onClick={handleTypeChangeReset}
              disabled={globalLoading}
              className="h-7 px-3 text-xs"
            >
              {globalLoading ? <Loader2 className="size-3 animate-spin" /> : "Reset"}
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        {agenda && agenda.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {agenda.length} item{agenda.length !== 1 ? "s" : ""}
          </span>
        )}

        {isInitialized && !isEmpty && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="ml-auto flex size-6 items-center justify-center rounded text-muted-foreground/60 transition hover:bg-muted hover:text-foreground"
              >
                <MoreHorizontal className="size-4" strokeWidth={1.75} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={handleResetToTemplate} disabled={globalLoading}>
                <RotateCcw className="mr-2 size-3.5" />
                Reset to template
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleClear}
                disabled={globalLoading}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 size-3.5" />
                Clear all
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {!isInitialized || isEmpty ? (
        <ModeSelection
          meetingType={meetingType}
          onSelect={handleModeSelect}
          isLoading={globalLoading}
        />
      ) : (
        <div className="space-y-2">
          <div className="divide-y divide-border/40 rounded-xl border border-border/50 px-3">
            {agenda.map((item, index) => (
              <AgendaItemRow
                key={item.id}
                item={item}
                index={index}
                total={agenda.length}
                onUpdate={(updates) => handleUpdateItem(item.id, updates)}
                onRemove={() => handleRemoveItem(item.id)}
                onMoveUp={() => handleReorder(index, "up")}
                onMoveDown={() => handleReorder(index, "down")}
                isLoading={loadingIds.has(item.id) || globalLoading}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={handleAddItem}
            disabled={globalLoading}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border/60 py-2.5 text-xs text-muted-foreground transition hover:border-foreground/20 hover:text-foreground disabled:opacity-50"
          >
            {globalLoading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Plus className="size-3.5" strokeWidth={2.25} />
            )}
            Add item
          </button>
        </div>
      )}
    </div>
  );
}
