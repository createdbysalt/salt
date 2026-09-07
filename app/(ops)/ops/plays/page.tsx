import { notFound } from "next/navigation";
import { getPlatformAdmin } from "@/app/_lib/admin/platform-admin";
import { getPlaybookLibraryHealth } from "@/app/_features/admin/queries";
import { PlaysSectionHeader } from "@/app/_features/plays/components/PlaysSectionHeader";
import { PlaybookLibrarySection } from "../_components/PlaybookLibrarySection";

export const dynamic = "force-dynamic";

/**
 * Salt Ops → Features → Plays: discovery health of the shipped playbook
 * library. Platform-global (the library is Salt-authored repo content), so it
 * lives here and not in the user-facing Playbooks tab.
 */
export default async function PlaysOpsPage() {
  const admin = await getPlatformAdmin();
  if (!admin.ok) {
    notFound();
  }

  const health = await getPlaybookLibraryHealth();

  return (
    <div className="space-y-8">
      <PlaysSectionHeader
        eyebrow="Salt Ops"
        title="Plays"
        description="Discovery health of the shipped playbook library. A validation error or structural skip here means a playbook silently vanished from every workspace."
      />
      <PlaybookLibrarySection data={health} />
    </div>
  );
}
