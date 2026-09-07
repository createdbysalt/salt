import { notFound } from "next/navigation";
import { getPlatformAdmin } from "@/app/_lib/admin/platform-admin";
import { getMemoryCareHealth } from "@/app/_features/admin/queries";
import { PlaysSectionHeader } from "@/app/_features/plays/components/PlaysSectionHeader";
import { MemoryCareSection } from "../_components/MemoryCareSection";

export const dynamic = "force-dynamic";

/**
 * Salt Ops → Features → Memory: Memory Care health — apply volume vs user
 * undos, and which fields draw corrections. Platform-global: users see their
 * own Handled feed; only the operator sees the cross-workspace quality signal.
 */
export default async function MemoryOpsPage() {
  const admin = await getPlatformAdmin();
  if (!admin.ok) {
    notFound();
  }

  const health = await getMemoryCareHealth();

  return (
    <div className="space-y-8">
      <PlaysSectionHeader
        eyebrow="Salt Ops"
        title="Memory"
        description="Memory Care health: what Salt applied, how often users undid it, and which fields draw corrections."
      />
      <MemoryCareSection data={health} />
    </div>
  );
}
