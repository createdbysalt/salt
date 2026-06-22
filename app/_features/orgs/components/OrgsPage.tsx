"use client";

import { Plus } from "lucide-react";
import { toast } from "sonner";
import type { Organization } from "@/app/_features/relationships/types";
import { PlaysSectionHeader } from "@/app/_features/plays/components/PlaysSectionHeader";
import { toDirectoryOrg } from "@/app/_features/orgs/utils/directory-mapper";
import { OrgsDirectoryTable } from "./OrgsDirectoryTable";

interface OrgsPageProps {
  initialOrganizations?: Organization[];
}

export function OrgsPage({ initialOrganizations = [] }: OrgsPageProps) {
  const orgs = initialOrganizations.map(toDirectoryOrg);

  return (
    <div className="relative min-h-full">
      <div aria-hidden className="salt-ambient-wash" />

      <div className="mx-auto w-full max-w-[1400px] space-y-8">
        <PlaysSectionHeader
          eyebrow="Memory"
          title="Organizations"
          description="Every company and account in one place — with health, contacts, and the context Salt uses to surface what matters."
          action={
            <button
              type="button"
              onClick={() => toast("New org form (coming soon)")}
              className="surface-aurora relative inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-white shadow-[var(--shadow-lift)] hover:-translate-y-0.5 transition-transform"
            >
              <Plus className="size-4 relative z-10" strokeWidth={2.5} />
              <span className="relative z-10">New org</span>
            </button>
          }
        />

        <OrgsDirectoryTable orgs={orgs} />
      </div>
    </div>
  );
}
