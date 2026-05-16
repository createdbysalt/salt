import { CheckCircle2 } from "lucide-react";
import { BriefingSection } from "./BriefingSection";
import { BriefingItem } from "./BriefingItem";
import type { BriefingItemData } from "./types";

interface NeedsAttentionSectionProps {
  items: BriefingItemData[];
}

export function NeedsAttentionSection({ items }: NeedsAttentionSectionProps) {
  if (items.length === 0) {
    return (
      <BriefingSection title="heads up" variant="default" id="needs-attention">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="relative">
            <div className="absolute inset-0 animate-pulse rounded-full bg-success/10 blur-xl" />
            <div className="relative flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-success/20 to-success/5">
              <CheckCircle2 className="size-6 text-success/70" />
            </div>
          </div>
          <p className="mt-4 text-sm font-medium text-foreground/80">
            All clear
          </p>
          <p className="mt-1 text-xs text-muted-foreground/60">
            No items need your attention right now
          </p>
        </div>
      </BriefingSection>
    );
  }

  return (
    <BriefingSection
      title="heads up"
      count={items.length}
      variant="warning"
      id="needs-attention"
    >
      <div>
        {items.map((item) => (
          <BriefingItem key={item.id} item={item} />
        ))}
      </div>
    </BriefingSection>
  );
}
