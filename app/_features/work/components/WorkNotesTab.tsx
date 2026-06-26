"use client";

import { useState } from "react";
import { Search, StickyNote } from "lucide-react";
import { SaltActionButton } from "@/app/_features/memory/components/SaltActionButton";
import type { PersonNote } from "@/app/_lib/demo/people-demo-data";
import type { WorkDetailViewModel } from "@/app/_features/work/types";

export function WorkNotesTab({
  work,
  notes,
}: {
  work: WorkDetailViewModel;
  notes: PersonNote[];
}) {
  const [query, setQuery] = useState("");
  const filtered = notes.filter((note) =>
    note.body.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search
            className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            strokeWidth={2}
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search notes..."
            className="h-9 w-full rounded-full border border-border/60 bg-card/60 pl-9 pr-3 text-sm transition placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-flame/30"
          />
        </div>
        <SaltActionButton title="Salt will capture and save this note for you">
          Add note
        </SaltActionButton>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border/60 bg-card/40 p-8 text-center">
          <StickyNote className="mx-auto mb-3 size-6 text-muted-foreground" strokeWidth={1.75} />
          <h3 className="font-display text-xl tracking-tight text-foreground">No notes yet</h3>
          <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-muted-foreground">
            Notes attached to {work.title} will appear here once you add them.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((note) => (
            <li key={note.id} className="rounded-2xl border border-border/60 bg-card p-4">
              <p className="text-sm leading-relaxed text-foreground/80">{note.body}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
