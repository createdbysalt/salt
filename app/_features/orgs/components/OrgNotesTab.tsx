"use client";

import { useState, type ReactNode } from "react";
import {
  Sparkles,
  Search,
  Pin,
  PinOff,
  MoreHorizontal,
  Pencil,
  Trash2,
  SlidersHorizontal,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { SaltActionButton } from "@/app/_features/memory/components/SaltActionButton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@repo/ui";
import { cn } from "@repo/utils";
import type { PersonNote } from "@/app/_lib/demo/people-demo-data";
import type { Org } from "@/app/_lib/demo/orgs-demo-data";
import { relativeDays } from "@/app/_lib/demo/orgs-demo-data";
import type { OrgNote } from "@/app/_features/orgs/types";
import { createOrgNote } from "@/app/_features/orgs/actions/connections";
import { deleteNote, toggleNotePinned } from "@/app/_features/memory/actions";

type FilterKey = "all" | "pinned" | "you" | "salt";
type NoteWithMeta = (PersonNote | OrgNote) & { pinned?: boolean };

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All notes" },
  { key: "pinned", label: "Pinned" },
  { key: "you", label: "You" },
  { key: "salt", label: "Salt" },
];

function groupByTime(notes: NoteWithMeta[]) {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const today: NoteWithMeta[] = [];
  const week: NoteWithMeta[] = [];
  const earlier: NoteWithMeta[] = [];
  for (const n of notes) {
    const diff = now - new Date(n.at).getTime();
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

export function OrgNotesTab({
  org,
  notes: initialNotes,
  isDemoOrg = false,
  onNotesChanged,
}: {
  org: Org;
  notes: NoteWithMeta[];
  isDemoOrg?: boolean;
  onNotesChanged?: () => void;
}) {
  const [notes, setNotes] = useState<NoteWithMeta[]>(initialNotes);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [draft, setDraft] = useState("");

  async function add() {
    const body = draft.trim();
    if (!body) return;

    if (isDemoOrg) {
      setNotes((prev) => [
        { id: crypto.randomUUID(), author: "you", at: new Date().toISOString(), body },
        ...prev,
      ]);
    } else {
      const result = await createOrgNote({ orgId: org.id, orgName: org.name, content: body });
      if (!result.success) {
        toast.error(result.error ?? "Could not save note");
        return;
      }
      onNotesChanged?.();
    }

    setDraft("");
    setAddOpen(false);
    toast.success("Note saved");
  }

  async function togglePin(id: string) {
    const note = notes.find((n) => n.id === id);
    if (!note) return;

    if (isDemoOrg) {
      setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n)));
      return;
    }

    const result = await toggleNotePinned(id, !note.pinned);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n)));
    onNotesChanged?.();
  }

  async function remove(id: string) {
    if (isDemoOrg) {
      setNotes((prev) => prev.filter((n) => n.id !== id));
      toast("Note deleted");
      return;
    }

    const result = await deleteNote(id);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setNotes((prev) => prev.filter((n) => n.id !== id));
    toast("Note deleted");
    onNotesChanged?.();
  }

  const filtered = notes.filter((n) => {
    if (filter === "pinned" && !n.pinned) return false;
    if (filter === "you" && n.author !== "you") return false;
    if (filter === "salt" && n.author !== "salt") return false;
    if (query && !n.body.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  const pinned = filtered.filter((n) => n.pinned);
  const unpinned = filtered.filter((n) => !n.pinned);
  const groups = groupByTime(unpinned);
  const activeFilterLabel = FILTERS.find((f) => f.key === filter)?.label ?? "All notes";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative w-full sm:w-72">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
            strokeWidth={2}
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes…"
            className="w-full pl-9 pr-3 h-9 bg-card/60 border border-border/60 rounded-full text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-flame/30 transition"
          />
        </div>

        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  "h-9 px-3 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card text-sm font-medium text-foreground/80 hover:bg-muted/60 transition",
                  filter !== "all" && "border-foreground/40 text-foreground",
                )}
              >
                <SlidersHorizontal className="size-4" strokeWidth={2} />
                <span>{activeFilterLabel}</span>
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-48 p-1">
              {FILTERS.map((f) => {
                const active = filter === f.key;
                return (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    className={cn(
                      "w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md text-sm hover:bg-muted/60 transition text-left",
                      active ? "text-foreground font-medium" : "text-foreground/80",
                    )}
                  >
                    <span className="inline-flex items-center gap-2">
                      {f.key === "salt" && (
                        <Sparkles className="size-3.5 text-flame" strokeWidth={2.25} />
                      )}
                      {f.label}
                    </span>
                    {active && <Check className="size-3.5" strokeWidth={2.5} />}
                  </button>
                );
              })}
            </PopoverContent>
          </Popover>

          <SaltActionButton
            onClick={() => setAddOpen(true)}
            className="px-4 shadow-sm"
            title="Salt will capture and save this note for you"
          >
            Add note
          </SaltActionButton>
        </div>
      </div>

      {pinned.length > 0 && (
        <NoteGroup label="Pinned" items={pinned} onPin={togglePin} onDelete={remove} />
      )}

      {groups.length > 0 ? (
        groups.map((g) => (
          <NoteGroup
            key={g.label}
            label={g.label}
            items={g.items}
            onPin={togglePin}
            onDelete={remove}
          />
        ))
      ) : pinned.length === 0 ? (
        <EmptyState query={query} filter={filter} onAdd={() => setAddOpen(true)} />
      ) : null}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add note about {org.name}</DialogTitle>
          </DialogHeader>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                void add();
              }
            }}
            autoFocus
            placeholder={`Write a note about ${org.name}…`}
            className="w-full min-h-[140px] resize-none bg-transparent text-[15px] leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none border border-border/60 rounded-lg p-3"
          />
          <DialogFooter>
            <button
              onClick={() => setAddOpen(false)}
              className="h-9 px-4 rounded-lg text-sm font-medium text-foreground/70 hover:bg-muted/60 transition"
            >
              Cancel
            </button>
            <button
              onClick={() => void add()}
              disabled={!draft.trim()}
              className="h-9 px-4 rounded-lg bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Save note
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NoteGroup({
  label,
  items,
  onPin,
  onDelete,
}: {
  label: string;
  items: NoteWithMeta[];
  onPin: (id: string) => void;
  onDelete: (id: string) => void;
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
        <NoteCard key={n.id} note={n} onPin={onPin} onDelete={onDelete} />
      ))}
    </div>
  );
}

function NoteCard({
  note,
  onPin,
  onDelete,
}: {
  note: NoteWithMeta;
  onPin: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const isSalt = note.author === "salt";
  return (
    <div
      className={cn(
        "group relative bg-card rounded-2xl border p-5 shadow-sm hover:shadow-md transition-all",
        isSalt ? "border-flame/25" : "border-border/60",
      )}
    >
      <div className="flex justify-between items-start mb-3 gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {isSalt ? (
            <span className="size-6 rounded-full bg-flame/10 grid place-items-center text-flame shrink-0">
              <Sparkles className="size-3.5" strokeWidth={2.25} />
            </span>
          ) : (
            <span className="size-6 rounded-full bg-muted grid place-items-center text-[10px] font-bold text-foreground/70 shrink-0">
              You
            </span>
          )}
          <span className="text-xs font-semibold text-foreground">
            {isSalt ? "Salt" : "You"}
          </span>
          <span className="text-[11px] text-muted-foreground truncate">
            · {relativeDays(note.at)}
          </span>
          {note.pinned && (
            <Pin className="size-3 text-muted-foreground" strokeWidth={2} fill="currentColor" />
          )}
        </div>
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          <button
            onClick={() => void onPin(note.id)}
            className="p-1.5 hover:bg-muted/60 rounded-lg text-muted-foreground hover:text-foreground transition"
            aria-label={note.pinned ? "Unpin" : "Pin"}
          >
            {note.pinned ? (
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
                icon={<Pencil className="size-3.5" strokeWidth={2} />}
                label="Edit"
                onClick={() => toast("Edit coming soon")}
              />
              <div className="my-1 h-px bg-border/60" />
              <MenuItem
                icon={<Trash2 className="size-3.5" strokeWidth={2} />}
                label="Delete"
                destructive
                onClick={() => void onDelete(note.id)}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
      <p className="text-sm leading-relaxed text-foreground/90">{note.body}</p>
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  destructive,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm hover:bg-muted/60 transition text-left",
        destructive ? "text-destructive hover:bg-destructive/10" : "text-foreground/85",
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
