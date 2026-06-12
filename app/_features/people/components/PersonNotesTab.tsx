"use client";

import { useState, useMemo } from "react";
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
import { WikilinkTextarea } from "@/app/_features/memory/components/WikilinkTextarea";
import { WikilinkRenderer } from "@/app/_features/memory/components/WikilinkRenderer";
import { BacklinksPanel, type Backlink } from "@/app/_features/memory/components/BacklinksPanel";
import { getAllLinkableEntities } from "@/app/_features/memory/components/linkableMemory";
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
import type { Person, PersonNote } from "@/app/_lib/demo/people-demo-data";
import { relativeDays, PEOPLE } from "@/app/_lib/demo/people-demo-data";
import { hasWikilinks } from "@/app/_lib/notes";

type FilterKey = "all" | "pinned" | "you" | "salt";
type NoteWithMeta = PersonNote & { pinned?: boolean };

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

export function PersonNotesTab({ person }: { person: Person }) {
  const [notes, setNotes] = useState<NoteWithMeta[]>(person.notes);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [draft, setDraft] = useState("");

  const linkableEntities = useMemo(() => getAllLinkableEntities(), []);

  const backlinks = useMemo(() => {
    const links: Backlink[] = [];
    for (const p of PEOPLE) {
      if (p.id === person.id) continue;
      for (const note of p.notes) {
        if (note.body.toLowerCase().includes(person.name.toLowerCase())) {
          links.push({
            id: `${p.id}-${note.id}`,
            sourceType: "person",
            sourceId: p.id,
            sourceName: p.name,
            sourceSlug: p.name.toLowerCase().replace(/\s+/g, "-"),
            excerpt: note.body.slice(0, 120) + (note.body.length > 120 ? "…" : ""),
            author: note.author,
            createdAt: note.at,
          });
        }
      }
    }
    return links;
  }, [person.id, person.name]);

  function add() {
    const body = draft.trim();
    if (!body) return;
    setNotes((prev) => [
      { id: crypto.randomUUID(), author: "you", at: new Date().toISOString(), body },
      ...prev,
    ]);
    setDraft("");
    setAddOpen(false);
    toast.success("Note saved");
  }

  function togglePin(id: string) {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n)));
  }
  function remove(id: string) {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    toast("Note deleted");
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
  const firstName = person.name.split(" ")[0];
  const activeFilterLabel = FILTERS.find((f) => f.key === filter)?.label ?? "All notes";

  return (
    <div className="flex flex-col gap-6">
      {/* Toolbar: search left, filter + add right */}
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

      {/* Pinned section */}
      {pinned.length > 0 && (
        <NoteGroup label="Pinned" items={pinned} onPin={togglePin} onDelete={remove} entities={linkableEntities} />
      )}

      {/* Time-grouped notes */}
      {groups.length > 0 ? (
        groups.map((g) => (
          <NoteGroup
            key={g.label}
            label={g.label}
            items={g.items}
            onPin={togglePin}
            onDelete={remove}
            entities={linkableEntities}
          />
        ))
      ) : pinned.length === 0 ? (
        <EmptyState query={query} filter={filter} onAdd={() => setAddOpen(true)} />
      ) : null}

      {/* Backlinks panel */}
      {backlinks.length > 0 && (
        <BacklinksPanel entityName={person.name} backlinks={backlinks} className="mt-6" />
      )}

      {/* Add note dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add note about {firstName}</DialogTitle>
          </DialogHeader>
          <div>
            <WikilinkTextarea
              value={draft}
              onChange={setDraft}
              entities={linkableEntities}
              autoFocus
              placeholder={`Write a note about ${firstName}… Type [[ to link people, orgs, or work.`}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  e.preventDefault();
                  add();
                }
              }}
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Tip: Type <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">[[</kbd> to link to people, organizations, or work.
            </p>
          </div>
          <DialogFooter>
            <button
              onClick={() => setAddOpen(false)}
              className="h-9 px-4 rounded-lg text-sm font-medium text-foreground/70 hover:bg-muted/60 transition"
            >
              Cancel
            </button>
            <button
              onClick={add}
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
  entities,
}: {
  label: string;
  items: NoteWithMeta[];
  onPin: (id: string) => void;
  onDelete: (id: string) => void;
  entities: ReturnType<typeof getAllLinkableEntities>;
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
        <NoteCard key={n.id} note={n} onPin={onPin} onDelete={onDelete} entities={entities} />
      ))}
    </div>
  );
}

function NoteCard({
  note,
  onPin,
  onDelete,
  entities,
}: {
  note: NoteWithMeta;
  onPin: (id: string) => void;
  onDelete: (id: string) => void;
  entities: ReturnType<typeof getAllLinkableEntities>;
}) {
  const isSalt = note.author === "salt";
  const noteHasLinks = hasWikilinks(note.body);
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
            onClick={() => onPin(note.id)}
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
                onClick={() => onDelete(note.id)}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
      <p className="text-sm leading-relaxed text-foreground/90">
        {noteHasLinks ? (
          <WikilinkRenderer content={note.body} entities={entities} />
        ) : (
          note.body
        )}
      </p>
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
