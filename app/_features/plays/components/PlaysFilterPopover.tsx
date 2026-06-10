import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui";
import { SlidersHorizontal, Check } from "lucide-react";
import { cn } from "@repo/utils";

export type FilterOption = {
  id: string;
  label: string;
  monogram?: string;
  swatchClass?: string;
};

type Props = {
  groupLabel: string;
  options: FilterOption[];
  value: string | null; // null = all
  onChange: (id: string | null) => void;
};

export function PlaysFilterPopover({ groupLabel, options, value, onChange }: Props) {
  const activeCount = value ? 1 : 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "inline-flex items-center gap-2 h-9 px-3.5 rounded-full text-[13px] font-medium border transition-all",
            activeCount > 0
              ? "bg-foreground text-background border-foreground"
              : "bg-card text-foreground/80 border-border/60 hover:border-border"
          )}
        >
          <SlidersHorizontal className="size-3.5" strokeWidth={2} />
          Filter
          {activeCount > 0 && (
            <span className="text-[11px] font-semibold tabular-nums bg-background/20 rounded-md px-1.5 py-0.5">
              {activeCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-4 rounded-2xl border-border/60">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
            {groupLabel}
          </p>
          {value && (
            <button
              onClick={() => onChange(null)}
              className="text-[11px] text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 gap-1">
          {options.map((o) => {
            const active = value === o.id;
            return (
              <button
                key={o.id}
                onClick={() => onChange(active ? null : o.id)}
                className={cn(
                  "w-full inline-flex items-center gap-2.5 h-9 px-2 rounded-xl text-[13px] font-medium transition",
                  active ? "bg-muted" : "hover:bg-muted/60"
                )}
              >
                {(o.monogram || o.swatchClass) && (
                  <span
                    className={cn(
                      "size-6 rounded-full grid place-items-center text-[10px] font-semibold",
                      o.swatchClass ?? "bg-muted text-foreground/70"
                    )}
                  >
                    {o.monogram}
                  </span>
                )}
                <span className="flex-1 text-left">{o.label}</span>
                {active && <Check className="size-4 text-foreground" strokeWidth={2.5} />}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
