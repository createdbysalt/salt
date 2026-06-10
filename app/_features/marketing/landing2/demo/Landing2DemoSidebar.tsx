import { Home, Network, Play, Inbox, Users, Brain, Settings, ChevronDown } from "lucide-react";
import { SALT_LOGO_PATH } from "../constants";
import { cn } from "@repo/utils";

const topNav = [
  { icon: Home, label: "HQ", active: true, badge: null as number | null },
  { icon: Network, label: "Connections", active: false, badge: null, disabled: true },
  { icon: Play, label: "Plays", active: false, badge: 6 },
  { icon: Inbox, label: "Capture", active: false, badge: 5 },
  { icon: Users, label: "Spaces", active: false, badge: null },
];

export function Landing2DemoSidebar() {
  return (
    <aside className="flex h-full w-[248px] shrink-0 flex-col gap-4 overflow-hidden border-r border-border/60 bg-background/60 px-4 py-5 backdrop-blur-xl">
      <div className="flex items-center justify-between px-2">
        <span
          aria-hidden
          className="block h-5 w-[40px] bg-foreground"
          style={{
            maskImage: `url(${SALT_LOGO_PATH})`,
            WebkitMaskImage: `url(${SALT_LOGO_PATH})`,
            maskRepeat: "no-repeat",
            WebkitMaskRepeat: "no-repeat",
            maskSize: "contain",
            WebkitMaskSize: "contain",
            maskPosition: "center",
            WebkitMaskPosition: "center",
          }}
        />
      </div>

      <div className="glass-card rounded-2xl p-3.5">
        <div className="mb-2 flex items-center gap-2">
          <div className="size-1.5 rounded-full bg-flame animate-pulse-glow" />
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Setup</span>
        </div>
        <p className="text-sm font-medium leading-snug text-foreground">Review suggested plays</p>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-muted">
          <div className="surface-aurora h-full w-[68%] rounded-full" />
        </div>
        <p className="mt-2 text-[11px] tabular-nums text-muted-foreground">4 of 6 complete</p>
      </div>

      <nav className="mt-1 flex flex-col gap-0.5">
        {topNav.map(({ icon: Icon, label, active, badge, disabled }) => (
          <div
            key={label}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200",
              active && "bg-foreground text-background shadow-[var(--shadow-card)]",
              !active && "text-foreground",
              disabled && "opacity-60",
            )}
          >
            <Icon className="size-[18px]" strokeWidth={active ? 2.25 : 1.75} />
            <span className={cn("font-medium", active && "font-semibold")}>{label}</span>
            {badge != null && (
              <span
                className={cn(
                  "ml-auto rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums",
                  active ? "bg-background/15 text-background" : "bg-muted text-muted-foreground",
                )}
              >
                {badge}
              </span>
            )}
          </div>
        ))}

        <div className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-foreground">
          <Brain className="size-[18px]" strokeWidth={1.75} />
          <span className="font-medium">Memory</span>
          <ChevronDown
            className="ml-auto size-4 -rotate-90 text-muted-foreground"
            strokeWidth={2}
          />
        </div>
      </nav>

      <div className="mt-auto flex items-center gap-2.5 rounded-xl px-2 py-2">
        <div className="grid size-8 place-items-center rounded-full bg-foreground text-xs font-semibold text-background">
          N
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">Nikita</p>
          <p className="truncate text-[11px] text-muted-foreground">Pro · 4.2k credits</p>
        </div>
        <Settings className="size-4 text-muted-foreground" />
      </div>
    </aside>
  );
}
