import type { MemoryCareHealth } from "@/app/_features/admin/queries";
import { Kpi, MiniDistribution, Section, SectionError } from "./Section";

/**
 * Memory Care health: applies are volume, undos are the quality signal. A
 * rising undo rate means care is applying too boldly — the trust threshold
 * or a field tier needs attention. Corrections by field show where.
 */
export function MemoryCareSection({
  data,
}: {
  data: MemoryCareHealth | null;
}) {
  const undoRate =
    data && data.applies7d > 0
      ? `${((data.undone7d / data.applies7d) * 100).toFixed(1)}% of applies`
      : undefined;

  return (
    <Section
      title="Memory Care"
      description="What Salt wrote to Memory in the last 7 days, and how often users walked it back."
    >
      {data === null ? (
        <SectionError section="Memory Care" />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi
              label="Writes applied · 7d"
              value={data.applies7d.toLocaleString()}
              hint={data.truncated ? "scan capped" : undefined}
            />
            <Kpi
              label="Undone by users · 7d"
              value={data.undone7d.toLocaleString()}
              hint={undoRate}
            />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <MiniDistribution
              title="Applies by record type"
              rows={data.appliesByEntity}
              empty="No writes applied in 7 days."
            />
            <MiniDistribution
              title="Corrections by field · 30d"
              rows={data.correctionsByField}
              empty="No corrections in 30 days."
            />
          </div>
        </div>
      )}
    </Section>
  );
}
