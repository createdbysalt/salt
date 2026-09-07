import { notFound } from "next/navigation";
import { getPlatformAdmin } from "@/app/_lib/admin/platform-admin";
import { getCapturePipeline } from "@/app/_features/admin/queries";
import { PlaysSectionHeader } from "@/app/_features/plays/components/PlaysSectionHeader";
import { CapturePipelineSection } from "../_components/CapturePipelineSection";

export const dynamic = "force-dynamic";

/**
 * Salt Ops → Features → Captures: the intake pipeline in detail — stub
 * backlog, 7d volume, source and gate-action distributions. The stub count
 * is the metric that would have exposed the Outlook break.
 */
export default async function CapturesOpsPage() {
  const admin = await getPlatformAdmin();
  if (!admin.ok) {
    notFound();
  }

  const capturePipeline = await getCapturePipeline();

  return (
    <div className="space-y-8">
      <PlaysSectionHeader
        eyebrow="Salt Ops"
        title="Captures"
        description="Intake pipeline health: what came in, where from, and how much of it is content-free stubs awaiting hydration."
      />
      <CapturePipelineSection data={capturePipeline} />
    </div>
  );
}
