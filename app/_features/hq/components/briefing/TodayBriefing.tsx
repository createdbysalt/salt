import { BriefingGlanceStrip } from "./BriefingGlanceStrip";
import { UpNextSection } from "./UpNextSection";
import { NeedsAttentionSection } from "./NeedsAttentionSection";
import { WinsSection } from "./WinsSection";
import type { BriefingData } from "./types";

interface TodayBriefingProps {
  data: BriefingData;
  showGlanceStrip?: boolean;
}

export function TodayBriefing({ data, showGlanceStrip = true }: TodayBriefingProps) {
  return (
    <div className="flex flex-col gap-6">
      {/* At-a-glance strip (optional - can be shown in tab bar instead) */}
      {showGlanceStrip && <BriefingGlanceStrip data={data.glance} />}

      {/* Up Next - Today's priorities */}
      <UpNextSection items={data.upNext} />

      {/* Heads Up - Warnings */}
      <NeedsAttentionSection items={data.needsAttention} />

      {/* Wins - Celebration */}
      <WinsSection wins={data.wins} totalValue={data.winsTotalValue} />
    </div>
  );
}
