"use client";

import type { Person as DbPerson } from "@/app/_features/relationships/types";
import { MemoryListAddButton } from "@/app/_features/memory/components/MemoryListAddButton";
import { PlaysSectionHeader } from "@/app/_features/plays/components/PlaysSectionHeader";
import { memoryListShellClass } from "@/app/_features/memory/utils/memory-layout";
import { toDirectoryPerson } from "@/app/_features/people/utils/directory-mapper";
import { PeopleDirectoryTable } from "./PeopleDirectoryTable";

interface PeoplePageProps {
  initialPeople?: DbPerson[];
}

export function PeoplePage({ initialPeople = [] }: PeoplePageProps) {
  const people = initialPeople.map(toDirectoryPerson);

  return (
    <div className="relative min-h-full">
      <div aria-hidden className="salt-ambient-wash" />

      <div className={memoryListShellClass}>
        <PlaysSectionHeader
          eyebrow="Memory"
          title="People"
          description="Every relationship in one place, with the context you need to decide who needs a touch and why."
          action={<MemoryListAddButton kind="person" label="Add person" />}
        />

        <PeopleDirectoryTable people={people} />
      </div>
    </div>
  );
}
