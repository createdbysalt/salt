"use client";

import type { Organization } from "@/app/_features/relationships/types";
import { MemoryListAddButton } from "@/app/_features/memory/components/MemoryListAddButton";
import { PlaysSectionHeader } from "@/app/_features/plays/components/PlaysSectionHeader";
import { memoryListShellClass } from "@/app/_features/memory/utils/memory-layout";
import { toDirectoryOrg } from "@/app/_features/orgs/utils/directory-mapper";
import { OrgsDirectoryTable } from "./OrgsDirectoryTable";

interface OrgsPageProps {
  initialOrganizations?: Organization[];
}

export function OrgsPage({ initialOrganizations = [] }: OrgsPageProps) {
  const orgs = initialOrganizations.map(toDirectoryOrg);

  return (
    <div className="relative min-h-full">
      <div className={memoryListShellClass}>
        <PlaysSectionHeader
          eyebrow="Memory"
          title="Organizations"
          description="Every company and account in one place — with health, contacts, and the context Salt uses to surface what matters."
          action={<MemoryListAddButton kind="org" label="Add organization" />}
        />

        <OrgsDirectoryTable orgs={orgs} />
      </div>
    </div>
  );
}
