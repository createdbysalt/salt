import { Sparkles } from "lucide-react";
import { BriefingSection } from "./BriefingSection";
import { BriefingItem } from "./BriefingItem";
import type { BriefingItemData } from "./types";

interface UpNextSectionProps {
  items: BriefingItemData[];
}

export function UpNextSection({ items }: UpNextSectionProps) {
  if (items.length === 0) {
    return (
      <BriefingSection title="up next">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="relative">
            <div className="absolute inset-0 animate-pulse rounded-full bg-primary/10 blur-xl" />
            <div className="relative flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5">
              <Sparkles className="size-6 text-primary/70" />
            </div>
          </div>
          <p className="mt-4 text-sm font-medium text-foreground/80">
            Nothing urgent today
          </p>
          <p className="mt-1 text-xs text-muted-foreground/60">
            Enjoy your clear schedule
          </p>
        </div>
      </BriefingSection>
    );
  }

  return (
    <BriefingSection title="up next" count={items.length}>
      <div>
        {items.map((item) => (
          <BriefingItem key={item.id} item={item} />
        ))}
      </div>
    </BriefingSection>
  );
}
