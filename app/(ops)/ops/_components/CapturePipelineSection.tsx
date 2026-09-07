import type { CapturePipelineData } from "@/app/_features/admin/queries";
import { Kpi, MiniDistribution, Section, SectionError } from "./Section";

/**
 * Capture pipeline: the stub count is the metric that would have exposed the
 * Outlook break — 655 content-free captures sat here for weeks.
 */
export function CapturePipelineSection({
  data,
}: {
  data: CapturePipelineData | null;
}) {
  return (
    <Section
      title="Capture pipeline"
      description="What came in over the last 7 days, and how much of it is content-free stubs awaiting hydration."
    >
      {data === null ? (
        <SectionError section="the capture pipeline" />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi
              label="Stubs awaiting hydration"
              value={data.stubCount.toLocaleString()}
              hint={`${data.stubCount7d.toLocaleString()} new in 7d`}
            />
            <Kpi
              label="Captures · 7d"
              value={data.total.toLocaleString()}
              hint={data.truncated ? "scan capped" : undefined}
            />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <MiniDistribution
              title="By source"
              rows={data.bySourceType}
              empty="Nothing captured in 7 days."
            />
            <MiniDistribution
              title="By gate action"
              rows={data.byGateAction}
              empty="Nothing captured in 7 days."
            />
          </div>
        </div>
      )}
    </Section>
  );
}
