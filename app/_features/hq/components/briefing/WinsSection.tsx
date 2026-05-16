import { Trophy, DollarSign, Handshake, Rocket, UserPlus, Sparkles } from "lucide-react";
import { cn } from "@repo/utils";
import { BriefingSection } from "./BriefingSection";
import type { WinItemData, WinType } from "./types";

const winConfig: Record<
  WinType,
  { icon: React.ReactNode; gradient: string; iconColor: string }
> = {
  payment: {
    icon: <DollarSign className="size-5" />,
    gradient: "from-success/20 via-success/10 to-transparent",
    iconColor: "text-success",
  },
  deal: {
    icon: <Handshake className="size-5" />,
    gradient: "from-success/20 via-success/10 to-transparent",
    iconColor: "text-success",
  },
  project: {
    icon: <Rocket className="size-5" />,
    gradient: "from-info/20 via-info/10 to-transparent",
    iconColor: "text-info",
  },
  client: {
    icon: <UserPlus className="size-5" />,
    gradient: "from-accent/20 via-accent/10 to-transparent",
    iconColor: "text-accent",
  },
};

function formatCurrency(amount: number): string {
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}k`;
  }
  return `$${amount}`;
}

interface WinCardProps {
  win: WinItemData;
}

function WinCard({ win }: WinCardProps) {
  const config = winConfig[win.type];

  return (
    <div
      className={cn(
        "group relative flex flex-col items-center gap-2 overflow-hidden rounded-xl px-5 py-4 text-center transition-all duration-300",
        "border border-white/[0.04] bg-white/[0.02]",
        "hover:border-success/20 hover:bg-white/[0.04]"
      )}
    >
      {/* Gradient background */}
      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity group-hover:opacity-100",
          config.gradient
        )}
      />

      {/* Content */}
      <div className="relative flex items-center gap-2">
        <span className={cn("transition-transform group-hover:scale-110", config.iconColor)}>
          {config.icon}
        </span>
        {win.value !== undefined && (
          <span className="text-lg font-bold tabular-nums tracking-tight text-success">
            +{formatCurrency(win.value)}
          </span>
        )}
      </div>
      <span className="relative text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
        {win.label}
      </span>
    </div>
  );
}

interface WinsSectionProps {
  wins: WinItemData[];
  totalValue?: number;
}

export function WinsSection({ wins, totalValue }: WinsSectionProps) {
  if (wins.length === 0) {
    return (
      <BriefingSection title="this week's wins" variant="success" id="wins">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="relative">
            <div className="absolute inset-0 animate-pulse rounded-full bg-muted/30 blur-xl" />
            <div className="relative flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-muted/30 to-muted/10">
              <Trophy className="size-6 text-muted-foreground/50" />
            </div>
          </div>
          <p className="mt-4 text-sm font-medium text-foreground/80">
            No wins yet this week
          </p>
          <p className="mt-1 text-xs text-muted-foreground/60">
            Keep going — they'll come!
          </p>
        </div>
      </BriefingSection>
    );
  }

  const summaryText =
    totalValue && totalValue > 0 ? `+${formatCurrency(totalValue)}` : undefined;

  return (
    <BriefingSection
      title="this week's wins"
      count={wins.length}
      summary={summaryText}
      variant="success"
      id="wins"
    >
      <div className="relative p-4">
        {/* Celebration sparkle effect */}
        <Sparkles className="absolute right-4 top-4 size-4 text-success/30" />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {wins.map((win) => (
            <WinCard key={win.id} win={win} />
          ))}
        </div>
      </div>
    </BriefingSection>
  );
}
