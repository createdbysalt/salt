"use client";

import * as React from "react";
import type { MockPerson } from "@/app/_lib/demo";
import { openAskSalt } from "../utils";

const CAPTURE_NOTES = [
  {
    id: "1",
    content: "Prefers Monday calls. Kids in school until 3pm PST.",
    author: "You",
    date: "Apr 2",
  },
  {
    id: "2",
    content: "Interested in our analytics offering for Q4.",
    author: "You",
    date: "Mar 15",
  },
  {
    id: "3",
    content: "Met at SaaStr conference, introduced by Mike.",
    author: "You",
    date: "Mar 1",
  },
];

export function PersonNotesTab({
  person,
  onUpdatePerson,
}: {
  person: MockPerson;
  onUpdatePerson: (patch: Partial<MockPerson>) => void;
}) {
  const [relationshipNotes, setRelationshipNotes] = React.useState(person.notes ?? "");
  const [newNote, setNewNote] = React.useState("");

  React.useEffect(() => {
    setRelationshipNotes(person.notes ?? "");
  }, [person.notes]);

  const saveRelationshipNotes = () => {
    onUpdatePerson({ notes: relationshipNotes.trim() || null });
  };

  return (
    <div className="space-y-8">
      <section>
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          Relationship context
        </p>
        <textarea
          value={relationshipNotes}
          onChange={(e) => setRelationshipNotes(e.target.value)}
          onBlur={saveRelationshipNotes}
          placeholder="Context Salt uses when drafting for this person…"
          rows={5}
          className="w-full resize-none rounded-md border-0 bg-transparent px-0 py-0 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0"
        />
      </section>

      <section>
        <p className="mb-3 text-xs font-medium text-muted-foreground">Notes</p>
        <ul className="divide-y divide-border">
          {CAPTURE_NOTES.map((note) => (
            <li key={note.id} className="py-4 first:pt-0">
              <p className="text-sm leading-relaxed">{note.content}</p>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {note.author} · {note.date}
              </p>
            </li>
          ))}
        </ul>
        <input
          type="text"
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && newNote.trim()) {
              openAskSalt(`Add a relationship note for ${person.name}: ${newNote.trim()}`);
              setNewNote("");
            }
          }}
          placeholder="Add a note…"
          className="mt-2 w-full border-0 bg-transparent py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-0"
        />
      </section>
    </div>
  );
}
