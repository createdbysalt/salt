"use client";

import { useMemo, useState, useTransition, useEffect } from "react";
import {
  Sparkles,
  Pin,
  PinOff,
  MoreHorizontal,
  Pencil,
  Trash2,
  SlidersHorizontal,
  Check,
  X,
  Loader2,
  RotateCcw,
  StickyNote,
  User,
  Heart,
  AlertCircle,
  ListChecks,
} from "lucide-react";
import { toast } from "sonner";
import {
  MemoryRecordTabSearch,
  MemoryRecordTabShell,
  memoryRecordFilterIconButtonClass,
  memoryRecordPanelActionClass,
} from "@/app/_features/memory/components/MemoryRecordTabHeader";
import { SaltActionButton } from "@/app/_features/memory/components/SaltActionButton";
import { WikilinkTextarea } from "@/app/_features/memory/components/WikilinkTextarea";
import { WikilinkRenderer } from "@/app/_features/memory/components/WikilinkRenderer";
import { getAllLinkableEntities } from "@/app/_features/memory/components/linkableMemory";
import { hasWikilinks } from "@/app/_lib/notes";
import { NoteTagSelect } from "@/app/_features/memory/components/EntityNotesTab";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  Badge,
  Button,
} from "@repo/ui";
import { cn } from "@repo/utils";
import {
  createNote,
  deleteNote,
  toggleNotePinned,
} from "@/app/_features/memory/actions";
import {
  confirmOperatorFact,
  forgetOperatorFact,
  reviseOperatorFact,
} from "../../actions";
import type {
  OperatorFactKind,
  OperatorFactSource,
  OperatorMemoryFact,
  OperatorNote,
} from "../../types";

type FilterKey = "all" | "pinned" | "you" | "salt";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pinned", label: "Pinned" },
  { key: "you", label: "Yours" },
  { key: "salt", label: "Salt's" },
];

const FACT_KIND_CONFIG: Record<
  OperatorFactKind,
  { icon: typeof AlertCircle; label: string; color: string }
> = {
  fact: { icon: AlertCircle, label: "Fact", color: "text-blue-500 bg-blue-500/10" },
  preference: { icon: Heart, label: "Preference", color: "text-pink-500 bg-pink-500/10" },
  procedure: { icon: ListChecks, label: "Procedure", color: "text-amber-500 bg-amber-500/10" },
};

/** Provenance receipts: where Salt picked this fact up. */
const FACT_SOURCE_LABELS: Record<OperatorFactSource, string | null> = {
  manual: null,
  ai_capture: "From your inbox",
  ask_salt: "From Ask Salt",
  draft_edit: "From your edits",
};

type FeedItem =
  | {
      itemType: "note";
      id: string;
      createdAt: string;
      authorType: "user";
      isPinned: boolean;
      isProposed: false;
      text: string;
      note: OperatorNote;
    }
  | {
      itemType: "fact";
      id: string;
      createdAt: string;
      authorType: "user" | "salt";
      isPinned: false;
      isProposed: boolean;
      text: string;
      fact: OperatorMemoryFact;
    };

function groupByTime(items: FeedItem[]) {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const today: FeedItem[] = [];
  const week: FeedItem[] = [];
  const earlier: FeedItem[] = [];
  for (const item of items) {
    const diff = now - new Date(item.createdAt).getTime();
    if (diff < day) today.push(item);
    else if (diff < 7 * day) week.push(item);
    else earlier.push(item);
  }
  return [
    { label: "Today", items: today },
    { label: "Earlier this week", items: week },
    { label: "Earlier", items: earlier },
  ].filter((g) => g.items.length);
}

function relativeDays(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return new Date(iso).toLocaleDateString();
}

export function MeNotesTab({
  workspaceId,
  notes: initialNotes,
  facts: initialFacts,
}: {
  workspaceId: string;
  notes: OperatorNote[];
  facts: OperatorMemoryFact[];
}) {
  const [notes, setNotes] = useState<OperatorNote[]>(initialNotes);
  const [facts, setFacts] = useState<OperatorMemoryFact[]>(initialFacts);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [draftTags, setDraftTags] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const handleAddNote = () => setAddOpen(true);
    window.addEventListener("me:add-note", handleAddNote);
    return () => window.removeEventListener("me:add-note", handleAddNote);
  }, []);

  const linkableEntities = useMemo(() => getAllLinkableEntities(), []);

  const items: FeedItem[] = useMemo(() => {
    const noteItems: FeedItem[] = notes.map((note) => ({
      itemType: "note",
      id: note.id,
      createdAt: note.createdAt,
      authorType: "user",
      isPinned: note.isPinned,
      isProposed: false,
      text: note.content,
      note,
    }));
    const factItems: FeedItem[] = facts
      .filter((f) => f.status !== "dismissed")
      .map((fact) => ({
        itemType: "fact",
        id: fact.id,
        createdAt: fact.createdAt,
        authorType: fact.source === "ai_capture" ? "salt" : "user",
        isPinned: false,
        isProposed: fact.status === "proposed",
        text: [fact.label, fact.value].filter(Boolean).join(" "),
        fact,
      }));
    return [...noteItems, ...factItems].sort((a, b) => {
      // Proposed facts surface first within the feed so the review gate stays visible
      if (a.isProposed !== b.isProposed) return a.isProposed ? -1 : 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [notes, facts]);

  const filtered = items.filter((item) => {
    if (filter === "pinned" && !item.isPinned) return false;
    if (filter === "you" && item.authorType !== "user") return false;
    if (filter === "salt" && item.authorType !== "salt") return false;
    if (query && !item.text.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  const pinned = filtered.filter((item) => item.isPinned);
  const groups = groupByTime(filtered.filter((item) => !item.isPinned));
  const activeFilterCount = filter !== "all" ? 1 : 0;
  const showToolbarControls = items.length > 0;

  const addNote = () => {
    const body = draft.trim();
    if (!body) return;
    startTransition(async () => {
      const res = await createNote(workspaceId, body, {
        category: "note",
        tags: draftTags,
      });
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      const id =
        "data" in res && res.data ? (res.data as { id: string }).id : crypto.randomUUID();
      setNotes((prev) => [
        {
          id,
          content: body,
          title: null,
          category: "note",
          isPinned: false,
          tags: draftTags,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      setDraft("");
      setDraftTags([]);
      setAddOpen(false);
      toast.success("Note saved");
    });
  };

  const removeNote = (id: string) => {
    startTransition(async () => {
      const res = await deleteNote(id);
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      setNotes((prev) => prev.filter((n) => n.id !== id));
      toast("Note deleted");
    });
  };

  const togglePin = (id: string) => {
    const note = notes.find((n) => n.id === id);
    if (!note) return;
    startTransition(async () => {
      const res = await toggleNotePinned(id, !note.isPinned);
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      setNotes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isPinned: !n.isPinned } : n))
      );
    });
  };

  const confirmFact = (id: string) => {
    startTransition(async () => {
      const res = await confirmOperatorFact(id);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      setFacts((prev) =>
        prev.map((f) =>
          f.id === id
            ? { ...f, status: "confirmed", confirmedAt: new Date().toISOString() }
            : f
        )
      );
      toast.success("Confirmed — Salt will keep using this");
    });
  };

  const forgetFact = (id: string, wasProposed: boolean) => {
    startTransition(async () => {
      const res = await forgetOperatorFact(id);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      setFacts((prev) => prev.filter((f) => f.id !== id));
      toast(wasProposed ? "Dismissed" : "Removed from memory");
    });
  };

  const reviseFact = (id: string, value: string, done: () => void) => {
    startTransition(async () => {
      const res = await reviseOperatorFact({ id, value });
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      setFacts((prev) => prev.map((f) => (f.id === id ? { ...f, value } : f)));
      toast.success("Updated");
      done();
    });
  };

  return (
    <MemoryRecordTabShell
      title="Notes"
      action={
        !addOpen ? (
          <button
            type="button"
            title="Salt will capture and save this note for you"
            onClick={() => setAddOpen(true)}
            className={memoryRecordPanelActionClass}
          >
            <StickyNote className="size-3.5 shrink-0" strokeWidth={2.25} />
            Add note
          </button>
        ) : null
      }
      showToolbar={showToolbarControls}
      toolbar={
        <div className="flex flex-wrap items-center gap-2">
          <MemoryRecordTabSearch
            value={query}
            onChange={setQuery}
            placeholder="Search notes…"
          />
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label="Filter notes"
                className={cn(
                  memoryRecordFilterIconButtonClass,
                  activeFilterCount > 0 && "border-foreground/40 text-foreground"
                )}
              >
                <SlidersHorizontal className="size-4" strokeWidth={2} />
                {activeFilterCount > 0 ? (
                  <span className="absolute -right-1 -top-1 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-semibold text-background">
                    {activeFilterCount}
                  </span>
                ) : null}
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-48 p-1">
              {FILTERS.map((f) => {
                const active = filter === f.key;
                return (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setFilter(f.key)}
                    className={cn(
                      "w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md text-sm hover:bg-muted/60 transition text-left",
                      active ? "text-foreground font-medium" : "text-foreground/80"
                    )}
                  >
                    <span className="inline-flex items-center gap-2">
                      {f.key === "salt" && (
                        <Sparkles className="size-3.5 text-flame" strokeWidth={2.25} />
                      )}
                      {f.label}
                    </span>
                    {active ? <Check className="size-3.5" strokeWidth={2.5} /> : null}
                  </button>
                );
              })}
            </PopoverContent>
          </Popover>
        </div>
      }
    >
      {/* Inline add note form */}
      {addOpen && (
        <div className="rounded-2xl border border-border/60 bg-card/40 p-4 space-y-4">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Note to yourself
            </p>
            <WikilinkTextarea
              value={draft}
              onChange={setDraft}
              entities={linkableEntities}
              autoFocus
              placeholder="Write a note… Type [[ to link to people, orgs, or work."
              className="min-h-[100px]"
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setAddOpen(false);
                  setDraft("");
                  setDraftTags([]);
                }
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  e.preventDefault();
                  addNote();
                }
              }}
            />
          </div>

          <NoteTagSelect selectedTags={draftTags} onChange={setDraftTags} />

          <div className="flex items-center justify-end gap-2 border-t border-border/40 pt-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-muted-foreground"
              onClick={() => {
                setAddOpen(false);
                setDraft("");
                setDraftTags([]);
              }}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-8 px-4"
              disabled={!draft.trim() || isPending}
              onClick={addNote}
            >
              {isPending ? <Loader2 className="size-3.5 animate-spin" /> : "Save note"}
            </Button>
          </div>
        </div>
      )}

      {pinned.length > 0 && (
        <FeedGroup
          label="Pinned"
          items={pinned}
          entities={linkableEntities}
          isPending={isPending}
          onPin={togglePin}
          onDeleteNote={removeNote}
          onConfirmFact={confirmFact}
          onForgetFact={forgetFact}
          onReviseFact={reviseFact}
        />
      )}

      {groups.length > 0 ? (
        groups.map((g) => (
          <FeedGroup
            key={g.label}
            label={g.label}
            items={g.items}
            entities={linkableEntities}
            isPending={isPending}
            onPin={togglePin}
            onDeleteNote={removeNote}
            onConfirmFact={confirmFact}
            onForgetFact={forgetFact}
            onReviseFact={reviseFact}
          />
        ))
      ) : pinned.length === 0 ? (
        <EmptyState query={query} filter={filter} onAdd={() => setAddOpen(true)} />
      ) : null}
    </MemoryRecordTabShell>
  );
}

// ─── Feed groups & cards ─────────────────────────────────────────────────────

interface FeedActions {
  entities: ReturnType<typeof getAllLinkableEntities>;
  isPending: boolean;
  onPin: (_id: string) => void;
  onDeleteNote: (_id: string) => void;
  onConfirmFact: (_id: string) => void;
  onForgetFact: (_id: string, _wasProposed: boolean) => void;
  onReviseFact: (_id: string, _value: string, _done: () => void) => void;
}

function FeedGroup({
  label,
  items,
  ...actions
}: { label: string; items: FeedItem[] } & FeedActions) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          {label}
        </span>
        <div className="h-px flex-1 bg-border/60" />
      </div>
      {items.map((item) =>
        item.itemType === "note" ? (
          <PersonalNoteCard key={item.id} note={item.note} {...actions} />
        ) : (
          <FactCard key={item.id} fact={item.fact} {...actions} />
        )
      )}
    </div>
  );
}

function PersonalNoteCard({
  note,
  entities,
  isPending,
  onPin,
  onDeleteNote,
}: { note: OperatorNote } & FeedActions) {
  const noteHasLinks = hasWikilinks(note.content);

  return (
    <div className="group relative bg-card rounded-2xl border border-border/60 p-5 shadow-sm hover:shadow-md transition-all">
      <div className="flex justify-between items-start mb-3 gap-3">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <span className="size-8 shrink-0 rounded-xl grid place-items-center bg-muted text-foreground">
            <User className="size-3.5" strokeWidth={2.25} />
          </span>
          <span className="text-xs font-semibold text-foreground">You</span>
          <span className="text-[11px] text-muted-foreground truncate">
            · {relativeDays(note.createdAt)}
          </span>
          {note.isPinned && (
            <Pin
              className="size-3 text-muted-foreground"
              strokeWidth={2}
              fill="currentColor"
            />
          )}
        </div>

        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          <button
            onClick={() => onPin(note.id)}
            disabled={isPending}
            className="p-1.5 hover:bg-muted/60 rounded-lg text-muted-foreground hover:text-foreground transition disabled:opacity-50"
            aria-label={note.isPinned ? "Unpin" : "Pin"}
          >
            {note.isPinned ? (
              <PinOff className="size-4" strokeWidth={2} />
            ) : (
              <Pin className="size-4" strokeWidth={2} />
            )}
          </button>
          <Popover>
            <PopoverTrigger asChild>
              <button
                className="p-1.5 hover:bg-muted/60 rounded-lg text-muted-foreground hover:text-foreground transition"
                aria-label="More"
              >
                <MoreHorizontal className="size-4" strokeWidth={2} />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-44 p-1">
              <MenuItem
                icon={<Trash2 className="size-3.5" strokeWidth={2} />}
                label="Delete"
                destructive
                onClick={() => onDeleteNote(note.id)}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <p className="text-sm leading-relaxed text-foreground/90">
        {noteHasLinks ? (
          <WikilinkRenderer content={note.content} entities={entities} />
        ) : (
          note.content
        )}
      </p>

      {note.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {note.tags.map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className="border-border/60 bg-muted/40 text-[10px] px-2 text-muted-foreground"
            >
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function FactCard({
  fact,
  isPending,
  onConfirmFact,
  onForgetFact,
  onReviseFact,
}: { fact: OperatorMemoryFact } & FeedActions) {
  const [revising, setRevising] = useState(false);
  const [draft, setDraft] = useState(fact.value);
  const isSalt = fact.source === "ai_capture";
  const isProposed = fact.status === "proposed";
  const sourceLabel = FACT_SOURCE_LABELS[fact.source];
  const kindConfig = FACT_KIND_CONFIG[fact.kind];

  return (
    <div
      className={cn(
        "group relative bg-card rounded-2xl border p-5 shadow-sm hover:shadow-md transition-all",
        isSalt ? "border-flame/25" : "border-border/60",
        isProposed && "border-flame/40 bg-flame/[0.02]"
      )}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-3 gap-3">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          {isSalt ? (
            <span className="surface-aurora grid size-8 shrink-0 place-items-center rounded-xl">
              <Sparkles className="relative z-10 size-3.5 text-white" strokeWidth={2.5} />
            </span>
          ) : (
            <span className="size-8 shrink-0 rounded-xl grid place-items-center bg-muted text-foreground">
              <User className="size-3.5" strokeWidth={2.25} />
            </span>
          )}
          <span className="text-xs font-semibold text-foreground">
            {isSalt ? "Salt" : "You"}
          </span>
          {sourceLabel && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
              {sourceLabel}
            </Badge>
          )}
          {kindConfig && (
            <span
              className={cn(
                "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium",
                kindConfig.color
              )}
            >
              <kindConfig.icon className="size-3" strokeWidth={2} />
              {kindConfig.label}
            </span>
          )}
          {fact.voteCount > 1 && (
            <Badge
              variant="outline"
              className="border-border/60 bg-muted/40 text-[10px] px-1.5 py-0 h-5 text-muted-foreground"
            >
              Seen {fact.voteCount}×
            </Badge>
          )}
          <span className="text-[11px] text-muted-foreground truncate">
            · {relativeDays(fact.createdAt)}
          </span>
        </div>

        {/* Hover actions for confirmed facts */}
        {!isProposed && !revising && (
          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
            <button
              onClick={() => {
                setDraft(fact.value);
                setRevising(true);
              }}
              disabled={isPending}
              className="p-1.5 hover:bg-muted/60 rounded-lg text-muted-foreground hover:text-foreground transition disabled:opacity-50"
              aria-label="Revise"
            >
              <Pencil className="size-4" strokeWidth={2} />
            </button>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className="p-1.5 hover:bg-muted/60 rounded-lg text-muted-foreground hover:text-foreground transition"
                  aria-label="More"
                >
                  <MoreHorizontal className="size-4" strokeWidth={2} />
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-44 p-1">
                <MenuItem
                  icon={<RotateCcw className="size-3.5" strokeWidth={2} />}
                  label="Forget"
                  destructive
                  onClick={() => onForgetFact(fact.id, false)}
                />
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>

      {/* Confidence indicator for proposed Salt facts */}
      {isProposed && fact.confidence !== null && (
        <div className="mb-3 flex items-center gap-2">
          <div className="h-1 flex-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-flame/60 rounded-full transition-all"
              style={{ width: `${fact.confidence}%` }}
            />
          </div>
          <span className="text-[10px] text-muted-foreground font-medium">
            {Math.round(fact.confidence)}% confident
          </span>
        </div>
      )}

      {/* Content */}
      {revising ? (
        <div className="space-y-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            autoFocus
          />
          <div className="flex items-center justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-muted-foreground"
              onClick={() => {
                setRevising(false);
                setDraft(fact.value);
              }}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-8 px-4"
              onClick={() => onReviseFact(fact.id, draft.trim(), () => setRevising(false))}
              disabled={isPending || !draft.trim()}
            >
              {isPending ? <Loader2 className="size-3.5 animate-spin" /> : "Save"}
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm leading-relaxed text-foreground/90">
          {fact.label && (
            <span className="font-medium text-foreground">{fact.label}: </span>
          )}
          {fact.value}
        </p>
      )}

      {/* Proposed fact actions */}
      {isProposed && !revising && (
        <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Salt noticed this. Nothing is used until you confirm it.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => onForgetFact(fact.id, true)}
              disabled={isPending}
              className="h-8 px-3 rounded-lg border border-border/60 bg-card text-sm font-medium text-foreground/70 hover:bg-muted/60 transition inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              <X className="size-3.5" strokeWidth={2} />
              Dismiss
            </button>
            <button
              onClick={() => {
                setDraft(fact.value);
                setRevising(true);
              }}
              disabled={isPending}
              className="h-8 px-3 rounded-lg border border-border/60 bg-card text-sm font-medium text-foreground/70 hover:bg-muted/60 transition inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              <Pencil className="size-3.5" strokeWidth={2} />
              Revise
            </button>
            <button
              onClick={() => onConfirmFact(fact.id)}
              disabled={isPending}
              className="h-8 px-3 rounded-lg bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Check className="size-3.5" strokeWidth={2} />
              )}
              Confirm
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  destructive,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm hover:bg-muted/60 transition text-left",
        destructive ? "text-destructive hover:bg-destructive/10" : "text-foreground/85"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function EmptyState({
  query,
  filter,
  onAdd,
}: {
  query: string;
  filter: FilterKey;
  onAdd: () => void;
}) {
  const hasFilters = !!query || filter !== "all";
  return (
    <div className="rounded-2xl border border-dashed border-border/60 bg-card/40 p-10 text-center flex flex-col items-center gap-3">
      <p className="text-sm text-muted-foreground">
        {hasFilters
          ? "No notes match your filters."
          : "No notes yet. Notes you write and facts Salt learns will show up here."}
      </p>
      {!hasFilters && (
        <SaltActionButton
          onClick={onAdd}
          className="px-4"
          title="Salt will capture and save this note for you"
        >
          Add note
        </SaltActionButton>
      )}
    </div>
  );
}
