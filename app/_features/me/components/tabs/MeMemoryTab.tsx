"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Plus,
  StickyNote,
  X,
  Link2,
  Check,
  RotateCcw,
  Sparkles,
  Loader2,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@repo/ui";
import { cn } from "@repo/utils";
import { WikilinkTextarea } from "@/app/_features/memory/components/WikilinkTextarea";
import { WikilinkRenderer } from "@/app/_features/memory/components/WikilinkRenderer";
import { getAllLinkableEntities } from "@/app/_features/memory/components/linkableMemory";
import { hasWikilinks } from "@/app/_lib/notes";
import { createNote, deleteNote } from "@/app/_features/memory/actions";
import { SectionCard } from "../MeSection";
import {
  confirmOperatorFact,
  forgetOperatorFact,
  reviseOperatorFact,
} from "../../actions";
import type { OperatorMemoryFact, OperatorNote } from "../../types";

export function MeMemoryTab({
  workspaceId,
  notes,
  facts,
}: {
  workspaceId: string;
  notes: OperatorNote[];
  facts: OperatorMemoryFact[];
}) {
  const proposed = facts.filter((f) => f.status === "proposed");
  const confirmed = facts.filter((f) => f.status === "confirmed");

  return (
    <div className="space-y-8">
      <PersonalNotes workspaceId={workspaceId} initialNotes={notes} />

      {proposed.length > 0 && (
        <SectionCard
          eyebrow="Review queue"
          title="Salt noticed these"
          description="Proposed memories from your activity. Nothing here is used until you confirm it."
        >
          <div className="space-y-2">
            {proposed.map((f) => (
              <FactRow key={f.id} fact={f} />
            ))}
          </div>
        </SectionCard>
      )}

      <SectionCard
        eyebrow="What Salt knows"
        title="Salt's memory about you"
        description="Confirmed facts Salt uses when it acts and writes as you. Correct anything that's off."
      >
        {confirmed.length > 0 ? (
          <div className="space-y-2">
            {confirmed.map((f) => (
              <FactRow key={f.id} fact={f} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border/60 bg-card/40 p-8 text-center">
            <Sparkles className="mx-auto size-8 text-muted-foreground/60" strokeWidth={1.5} />
            <p className="mt-2 text-sm text-muted-foreground">Salt hasn&apos;t learned anything yet.</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Facts you tell Salt or it learns from your activity will show up here.
            </p>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

// ─── Personal notes ─────────────────────────────────────────────────────────
function PersonalNotes({
  workspaceId,
  initialNotes,
}: {
  workspaceId: string;
  initialNotes: OperatorNote[];
}) {
  const [notes, setNotes] = useState<OperatorNote[]>(initialNotes);
  const [addOpen, setAddOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();

  const linkableEntities = useMemo(() => getAllLinkableEntities(), []);

  const addNote = () => {
    const body = draft.trim();
    if (!body) return;
    startTransition(async () => {
      const res = await createNote(workspaceId, body, { category: "note" });
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      const id = "data" in res && res.data ? (res.data as { id: string }).id : crypto.randomUUID();
      setNotes((prev) => [
        { id, content: body, title: null, category: "note", isPinned: false, createdAt: new Date().toISOString() },
        ...prev,
      ]);
      setDraft("");
      setAddOpen(false);
      toast.success("Note saved");
    });
  };

  const removeNote = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    startTransition(async () => {
      const res = await deleteNote(id);
      if ("error" in res && res.error) toast.error(res.error);
      else toast("Note deleted");
    });
  };

  return (
    <SectionCard
      eyebrow="Your notes"
      title="Personal memory"
      description="Quick notes to yourself. Use [[wikilinks]] to connect to people, orgs, and work."
      action={
        <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
          <Plus className="size-3.5" /> Add note
        </Button>
      }
    >
      {notes.length > 0 ? (
        <div className="space-y-2">
          {notes.map((note) => (
            <NoteCard key={note.id} note={note} entities={linkableEntities} onDelete={removeNote} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border/60 bg-card/40 p-8 text-center">
          <StickyNote className="mx-auto size-8 text-muted-foreground/60" strokeWidth={1.5} />
          <p className="mt-2 text-sm text-muted-foreground">No personal notes yet.</p>
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add personal note</DialogTitle>
          </DialogHeader>
          <WikilinkTextarea
            value={draft}
            onChange={setDraft}
            entities={linkableEntities}
            autoFocus
            placeholder="Write a note… Type [[ to link to people, orgs, or work."
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                addNote();
              }
            }}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={addNote} disabled={!draft.trim() || pending}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              Save note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SectionCard>
  );
}

function NoteCard({
  note,
  entities,
  onDelete,
}: {
  note: OperatorNote;
  entities: ReturnType<typeof getAllLinkableEntities>;
  onDelete: (id: string) => void;
}) {
  const noteHasLinks = hasWikilinks(note.content);
  const linkCount = noteHasLinks ? note.content.match(/\[\[/g)?.length ?? 0 : 0;

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 group">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-foreground leading-relaxed flex-1">
          {noteHasLinks ? <WikilinkRenderer content={note.content} entities={entities} /> : note.content}
        </p>
        <button
          onClick={() => onDelete(note.id)}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition"
          aria-label="Delete note"
        >
          <X className="size-3.5" strokeWidth={2} />
        </button>
      </div>
      {linkCount > 0 && (
        <div className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
          <Link2 className="size-3" strokeWidth={2} />
          {linkCount} link{linkCount !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}

// ─── Facts ──────────────────────────────────────────────────────────────────
function FactRow({ fact }: { fact: OperatorMemoryFact }) {
  const [pending, startTransition] = useTransition();
  const [revising, setRevising] = useState(false);
  const [draft, setDraft] = useState(fact.value);
  const isProposed = fact.status === "proposed";
  const fromSalt = fact.source === "ai_capture";

  const confirm = () =>
    startTransition(async () => {
      const res = await confirmOperatorFact(fact.id);
      if (res.ok) toast.success("Confirmed — Salt will keep using this");
      else toast.error(res.message);
    });

  const forget = () =>
    startTransition(async () => {
      const res = await forgetOperatorFact(fact.id);
      if (res.ok) toast.success("Removed from memory");
      else toast.error(res.message);
    });

  const saveRevision = () =>
    startTransition(async () => {
      const res = await reviseOperatorFact({ id: fact.id, value: draft });
      if (res.ok) {
        toast.success("Updated");
        setRevising(false);
      } else {
        toast.error(res.message);
      }
    });

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold shrink-0",
            fromSalt ? "bg-flame/10 text-flame border-flame/30" : "bg-muted text-foreground/70 border-border/60",
          )}
        >
          {fromSalt && <Sparkles className="size-2.5" strokeWidth={2.25} />}
          {fromSalt ? "Salt" : "You"}
        </span>
        {revising ? (
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            className="flex-1 rounded-lg border border-border/60 bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            autoFocus
          />
        ) : (
          <p className="text-sm text-foreground leading-snug flex-1">{fact.value}</p>
        )}
      </div>
      <div className="mt-3 flex items-center justify-end gap-1">
        {revising ? (
          <>
            <Button size="sm" variant="ghost" onClick={() => { setRevising(false); setDraft(fact.value); }} disabled={pending}>
              Cancel
            </Button>
            <Button size="sm" onClick={saveRevision} disabled={pending || !draft.trim()}>
              {pending && <Loader2 className="size-4 animate-spin" />} Save
            </Button>
          </>
        ) : (
          <>
            {isProposed && (
              <FactAction icon={Check} label="Confirm" onClick={confirm} disabled={pending} highlight />
            )}
            <FactAction icon={Pencil} label="Revise" onClick={() => setRevising(true)} disabled={pending} />
            <FactAction icon={isProposed ? X : RotateCcw} label={isProposed ? "Dismiss" : "Forget"} onClick={forget} disabled={pending} />
          </>
        )}
      </div>
    </div>
  );
}

function FactAction({
  icon: Icon,
  label,
  onClick,
  disabled,
  highlight,
}: {
  icon: typeof Check;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  highlight?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] transition disabled:opacity-50",
        highlight
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
          : "border-border/60 bg-card text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="size-3" /> {label}
    </button>
  );
}
