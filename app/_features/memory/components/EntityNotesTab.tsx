"use client";

import { useEffect, useState, useTransition } from "react";
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
  AlertCircle,
  Lightbulb,
  Heart,
  MessageSquare,
  Users,
  Flag,
  User,
  StickyNote,
} from "lucide-react";
import { toast } from "sonner";
import { SaltActionButton } from "@/app/_features/memory/components/SaltActionButton";
import {
  MemoryRecordTabSearch,
  MemoryRecordTabShell,
  memoryRecordFilterIconButtonClass,
  memoryRecordPanelActionClass,
} from "@/app/_features/memory/components/MemoryRecordTabHeader";
import { WikilinkTextarea } from "@/app/_features/memory/components/WikilinkTextarea";
import { WikilinkRenderer } from "@/app/_features/memory/components/WikilinkRenderer";
import { getVocabularyOptions } from "@/app/_features/memory/taxonomy/registry";
import type { ResolvedEntity } from "@/app/_lib/notes";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  Badge,
  Button,
} from "@repo/ui";
import { cn } from "@repo/utils";
import { hasWikilinks } from "@/app/_lib/notes";
import type { EntityNoteWithProvenance, EntityNoteKind, NoteSource } from "@/app/_features/memory/types/taxonomies";
import type { EntityType } from "@/app/_features/memory/queries/entity-notes";
import {
  createEntityNote,
  updateEntityNote,
  toggleEntityNotePin,
  archiveEntityNote,
  updateNoteTags,
} from "@/app/_features/memory/actions/entity-notes";
import {
  confirmSaltNote,
  dismissSaltNote,
} from "@/app/_features/memory/actions/create-salt-note";

type FilterKey = "all" | "pinned" | "you" | "salt";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pinned", label: "Pinned" },
  { key: "you", label: "Yours" },
  { key: "salt", label: "Salt's" },
];

const NOTE_KIND_CONFIG: Record<EntityNoteKind, { icon: typeof Lightbulb; label: string; color: string }> = {
  fact: { icon: AlertCircle, label: "Fact", color: "text-blue-500 bg-blue-500/10" },
  preference: { icon: Heart, label: "Preference", color: "text-pink-500 bg-pink-500/10" },
  context: { icon: MessageSquare, label: "Context", color: "text-amber-500 bg-amber-500/10" },
  relationship: { icon: Users, label: "Relationship", color: "text-violet-500 bg-violet-500/10" },
  flag: { icon: Flag, label: "Flag", color: "text-red-500 bg-red-500/10" },
};

const SOURCE_LABELS: Record<NoteSource, string> = {
  manual: "You",
  ai_capture: "Captured",
  ai_inference: "Inferred",
  system: "System",
};

const filterIconButtonClass = memoryRecordFilterIconButtonClass;

function groupByTime(notes: EntityNoteWithProvenance[]) {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const today: EntityNoteWithProvenance[] = [];
  const week: EntityNoteWithProvenance[] = [];
  const earlier: EntityNoteWithProvenance[] = [];
  for (const n of notes) {
    const diff = now - new Date(n.createdAt).getTime();
    if (diff < day) today.push(n);
    else if (diff < 7 * day) week.push(n);
    else earlier.push(n);
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

// Canon lives in the taxonomy registry (note_tags vocabulary).
export const NOTE_TAGS = getVocabularyOptions("note_tags");

export function NoteTagSelect({
  selectedTags,
  onChange,
}: {
  selectedTags: string[];
  onChange: (tags: string[]) => void;
}) {
  function toggleTag(tag: string) {
    if (selectedTags.includes(tag)) {
      onChange(selectedTags.filter((t) => t !== tag));
    } else {
      onChange([...selectedTags, tag]);
    }
  }

  const applied = NOTE_TAGS.filter((t) => selectedTags.includes(t.value));
  const available = NOTE_TAGS.filter((t) => !selectedTags.includes(t.value));

  return (
    <div className="space-y-3">
      {applied.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Applied
          </p>
          <div className="flex flex-wrap gap-1.5">
            {applied.map((tag) => (
              <button
                key={tag.value}
                type="button"
                onClick={() => toggleTag(tag.value)}
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition"
              >
                <Check className="size-3 shrink-0" strokeWidth={2.5} />
                <span>{tag.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {available.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            {applied.length > 0 ? "Add more" : "Tags"}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {available.map((tag) => (
              <button
                key={tag.value}
                type="button"
                onClick={() => toggleTag(tag.value)}
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium bg-muted/60 text-foreground/70 border border-border/40 hover:bg-muted hover:text-foreground transition"
              >
                <span>{tag.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface AddNoteFormProps {
  entityName: string;
  draft: string;
  setDraft: (value: string) => void;
  draftTags: string[];
  setDraftTags: (tags: string[]) => void;
  linkableEntities: ResolvedEntity[];
  isPending: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}

function AddNoteForm({
  entityName,
  draft,
  setDraft,
  draftTags,
  setDraftTags,
  linkableEntities,
  isPending,
  onSubmit,
  onCancel,
}: AddNoteFormProps) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 p-4 space-y-4">
      <div className="space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          Note about {entityName}
        </p>
        <WikilinkTextarea
          value={draft}
          onChange={setDraft}
          entities={linkableEntities}
          autoFocus
          placeholder={`Write a note… Type @ to mention people, orgs, or work.`}
          className="min-h-[100px]"
          onKeyDown={(e) => {
            if (e.key === "Escape") onCancel();
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              onSubmit();
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
          onClick={onCancel}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          className="h-8 px-4"
          disabled={!draft.trim() || isPending}
          onClick={onSubmit}
        >
          {isPending ? <Loader2 className="size-3.5 animate-spin" /> : "Save note"}
        </Button>
      </div>
    </div>
  );
}

interface EntityNotesTabProps {
  entityType: EntityType;
  entityId: string;
  entityName: string;
  notes: EntityNoteWithProvenance[];
  linkableEntities: ResolvedEntity[];
  onRefresh?: () => void;
}

export function EntityNotesTab({
  entityType,
  entityId,
  entityName,
  notes: initialNotes,
  linkableEntities,
  onRefresh,
}: EntityNotesTabProps) {
  const [notes, setNotes] = useState<EntityNoteWithProvenance[]>(initialNotes);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<EntityNoteWithProvenance | null>(null);
  const [draft, setDraft] = useState("");
  const [draftTags, setDraftTags] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const handleAddNote = () => setAddOpen(true);
    window.addEventListener("entity:add-note", handleAddNote);
    return () => window.removeEventListener("entity:add-note", handleAddNote);
  }, []);

  async function handleAdd() {
    const content = draft.trim();
    if (!content) return;

    startTransition(async () => {
      const result = await createEntityNote({
        entityType,
        entityId,
        content,
        tags: draftTags,
      });

      if (!result.success) {
        toast.error(result.error ?? "Could not save note");
        return;
      }

      // Optimistically add to list
      const newNote: EntityNoteWithProvenance = {
        id: result.noteId!,
        title: null,
        content,
        noteKind: "general",
        source: "manual",
        sourceRef: null,
        confidence: null,
        status: "confirmed",
        authorType: "user",
        isPinned: false,
        tags: draftTags,
        createdAt: new Date().toISOString(),
        author: "you",
        at: new Date().toISOString(),
        body: content,
        pinned: false,
      };

      setNotes((prev) => [newNote, ...prev]);
      setDraft("");
      setDraftTags([]);
      setAddOpen(false);
      toast.success("Note saved");
      onRefresh?.();
    });
  }

  async function handleUpdate() {
    if (!editingNote) return;
    const content = draft.trim();
    if (!content) return;

    startTransition(async () => {
      const result = await updateEntityNote({
        noteId: editingNote.id,
        content,
        tags: draftTags,
      });

      if (!result.success) {
        toast.error(result.error ?? "Could not update note");
        return;
      }

      setNotes((prev) =>
        prev.map((n) => (n.id === editingNote.id ? { ...n, content, body: content, tags: draftTags } : n))
      );
      setEditingNote(null);
      setDraft("");
      setDraftTags([]);
      toast.success("Note updated");
      onRefresh?.();
    });
  }

  async function handleTogglePin(id: string) {
    const note = notes.find((n) => n.id === id);
    if (!note) return;

    startTransition(async () => {
      const result = await toggleEntityNotePin({
        noteId: id,
        isPinned: !note.isPinned,
      });

      if (!result.success) {
        toast.error(result.error ?? "Could not update note");
        return;
      }

      setNotes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isPinned: !n.isPinned, pinned: !n.pinned } : n))
      );
      onRefresh?.();
    });
  }

  async function handleArchive(id: string) {
    startTransition(async () => {
      const result = await archiveEntityNote({ noteId: id });

      if (!result.success) {
        toast.error(result.error ?? "Could not delete note");
        return;
      }

      setNotes((prev) => prev.filter((n) => n.id !== id));
      toast("Note deleted");
      onRefresh?.();
    });
  }

  async function handleConfirm(id: string) {
    startTransition(async () => {
      const result = await confirmSaltNote({ noteId: id });

      if (!result.success) {
        toast.error(result.error ?? "Could not confirm note");
        return;
      }

      setNotes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, status: "confirmed" } : n))
      );
      toast.success("Note confirmed");
      onRefresh?.();
    });
  }

  async function handleDismiss(id: string) {
    startTransition(async () => {
      const result = await dismissSaltNote({ noteId: id });

      if (!result.success) {
        toast.error(result.error ?? "Could not dismiss note");
        return;
      }

      setNotes((prev) => prev.filter((n) => n.id !== id));
      toast("Note dismissed");
      onRefresh?.();
    });
  }

  function openEdit(note: EntityNoteWithProvenance) {
    setEditingNote(note);
    setDraft(note.content);
    setDraftTags(note.tags ?? []);
  }

  function closeEdit() {
    setEditingNote(null);
    setDraft("");
    setDraftTags([]);
  }

  const filtered = notes.filter((n) => {
    if (filter === "pinned" && !n.isPinned) return false;
    if (filter === "you" && n.authorType !== "user") return false;
    if (filter === "salt" && n.authorType !== "salt") return false;
    if (query && !n.content.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  const pinned = filtered.filter((n) => n.isPinned);
  const unpinned = filtered.filter((n) => !n.isPinned);
  const groups = groupByTime(unpinned);
  const firstName = entityName.split(" ")[0];
  const activeFilterCount = filter !== "all" ? 1 : 0;

  const showToolbarControls = notes.length > 0;

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
                  filterIconButtonClass,
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
        <AddNoteForm
          entityName={firstName}
          draft={draft}
          setDraft={setDraft}
          draftTags={draftTags}
          setDraftTags={setDraftTags}
          linkableEntities={linkableEntities}
          isPending={isPending}
          onSubmit={handleAdd}
          onCancel={() => {
            setAddOpen(false);
            setDraft("");
            setDraftTags([]);
          }}
        />
      )}

      {/* Pinned section */}
      {pinned.length > 0 && (
        <NoteGroup
          label="Pinned"
          items={pinned}
          onPin={handleTogglePin}
          onEdit={openEdit}
          onDelete={handleArchive}
          onConfirm={handleConfirm}
          onDismiss={handleDismiss}
          entities={linkableEntities}
          isPending={isPending}
          editingNoteId={editingNote?.id ?? null}
          editDraft={draft}
          setEditDraft={setDraft}
          editTags={draftTags}
          setEditTags={setDraftTags}
          onSaveEdit={handleUpdate}
          onCancelEdit={closeEdit}
        />
      )}

      {/* Time-grouped notes */}
      {groups.length > 0 ? (
        groups.map((g) => (
          <NoteGroup
            key={g.label}
            label={g.label}
            items={g.items}
            onPin={handleTogglePin}
            onEdit={openEdit}
            onDelete={handleArchive}
            onConfirm={handleConfirm}
            onDismiss={handleDismiss}
            entities={linkableEntities}
            isPending={isPending}
            editingNoteId={editingNote?.id ?? null}
            editDraft={draft}
            setEditDraft={setDraft}
            editTags={draftTags}
            setEditTags={setDraftTags}
            onSaveEdit={handleUpdate}
            onCancelEdit={closeEdit}
          />
        ))
      ) : pinned.length === 0 ? (
        <EmptyState query={query} filter={filter} onAdd={() => setAddOpen(true)} />
      ) : null}

    </MemoryRecordTabShell>
  );
}

function NoteGroup({
  label,
  items,
  onPin,
  onEdit,
  onDelete,
  onConfirm,
  onDismiss,
  entities,
  isPending,
  editingNoteId,
  editDraft,
  setEditDraft,
  editTags,
  setEditTags,
  onSaveEdit,
  onCancelEdit,
}: {
  label: string;
  items: EntityNoteWithProvenance[];
  onPin: (_id: string) => void;
  onEdit: (_note: EntityNoteWithProvenance) => void;
  onDelete: (_id: string) => void;
  onConfirm: (_id: string) => void;
  onDismiss: (_id: string) => void;
  entities: ResolvedEntity[];
  isPending: boolean;
  editingNoteId: string | null;
  editDraft: string;
  setEditDraft: (value: string) => void;
  editTags: string[];
  setEditTags: (tags: string[]) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          {label}
        </span>
        <div className="h-px flex-1 bg-border/60" />
      </div>
      {items.map((n) => (
        <NoteCard
          key={n.id}
          note={n}
          onPin={onPin}
          onEdit={onEdit}
          onDelete={onDelete}
          onConfirm={onConfirm}
          onDismiss={onDismiss}
          entities={entities}
          isPending={isPending}
          isEditing={editingNoteId === n.id}
          editDraft={editDraft}
          setEditDraft={setEditDraft}
          editTags={editTags}
          setEditTags={setEditTags}
          onSaveEdit={onSaveEdit}
          onCancelEdit={onCancelEdit}
        />
      ))}
    </div>
  );
}

function NoteCard({
  note,
  onPin,
  onEdit,
  onDelete,
  onConfirm,
  onDismiss,
  entities,
  isPending,
  isEditing,
  editDraft,
  setEditDraft,
  editTags,
  setEditTags,
  onSaveEdit,
  onCancelEdit,
}: {
  note: EntityNoteWithProvenance;
  onPin: (_id: string) => void;
  onEdit: (_note: EntityNoteWithProvenance) => void;
  onDelete: (_id: string) => void;
  onConfirm: (_id: string) => void;
  onDismiss: (_id: string) => void;
  entities: ResolvedEntity[];
  isPending: boolean;
  isEditing: boolean;
  editDraft: string;
  setEditDraft: (value: string) => void;
  editTags: string[];
  setEditTags: (tags: string[]) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
}) {
  const isSalt = note.authorType === "salt";
  const isProposed = note.status === "proposed";
  const noteHasLinks = hasWikilinks(note.content);
  const kindConfig = note.noteKind !== "general" ? NOTE_KIND_CONFIG[note.noteKind as EntityNoteKind] : null;

  // Inline edit mode
  if (isEditing) {
    return (
      <div className="rounded-2xl border border-primary/30 bg-card p-4 space-y-4">
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Edit note
          </p>
          <WikilinkTextarea
            value={editDraft}
            onChange={setEditDraft}
            entities={entities}
            autoFocus
            placeholder="Edit your note…"
            className="min-h-[100px]"
            onKeyDown={(e) => {
              if (e.key === "Escape") onCancelEdit();
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                onSaveEdit();
              }
            }}
          />
        </div>

        <NoteTagSelect selectedTags={editTags} onChange={setEditTags} />

        <div className="flex items-center justify-end gap-2 border-t border-border/40 pt-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-muted-foreground"
            onClick={onCancelEdit}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-8 px-4"
            disabled={!editDraft.trim() || isPending}
            onClick={onSaveEdit}
          >
            {isPending ? <Loader2 className="size-3.5 animate-spin" /> : "Save changes"}
          </Button>
        </div>
      </div>
    );
  }

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
          {isSalt && note.source !== "manual" && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
              {SOURCE_LABELS[note.source]}
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
          <span className="text-[11px] text-muted-foreground truncate">
            · {relativeDays(note.createdAt)}
          </span>
          {note.isPinned && (
            <Pin className="size-3 text-muted-foreground" strokeWidth={2} fill="currentColor" />
          )}
        </div>

        {/* Actions */}
        {!isProposed && (
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
                {!isSalt && (
                  <MenuItem
                    icon={<Pencil className="size-3.5" strokeWidth={2} />}
                    label="Edit"
                    onClick={() => onEdit(note)}
                  />
                )}
                <div className="my-1 h-px bg-border/60" />
                <MenuItem
                  icon={<Trash2 className="size-3.5" strokeWidth={2} />}
                  label="Delete"
                  destructive
                  onClick={() => onDelete(note.id)}
                />
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>

      {/* Confidence indicator for Salt notes */}
      {isSalt && note.confidence !== null && (
        <div className="mb-3 flex items-center gap-2">
          <div className="h-1 flex-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-flame/60 rounded-full transition-all"
              style={{ width: `${note.confidence}%` }}
            />
          </div>
          <span className="text-[10px] text-muted-foreground font-medium">
            {Math.round(note.confidence)}% confident
          </span>
        </div>
      )}

      {/* Content */}
      <p className="text-sm leading-relaxed text-foreground/90">
        {noteHasLinks ? (
          <WikilinkRenderer content={note.content} entities={entities} />
        ) : (
          note.content
        )}
      </p>

      {/* Tags */}
      {note.tags && note.tags.length > 0 && (
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

      {/* Proposed note actions */}
      {isProposed && (
        <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Salt suggested this note. Does it look right?
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => onDismiss(note.id)}
              disabled={isPending}
              className="h-8 px-3 rounded-lg border border-border/60 bg-card text-sm font-medium text-foreground/70 hover:bg-muted/60 transition inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              <X className="size-3.5" strokeWidth={2} />
              Dismiss
            </button>
            <button
              onClick={() => onConfirm(note.id)}
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
        {hasFilters ? "No notes match your filters." : "No notes yet."}
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
