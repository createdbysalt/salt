import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui";
import { SlidersHorizontal, Check } from "lucide-react";
import { cn } from "@repo/utils";

export type FilterOption = {
  id: string;
  label: string;
  monogram?: string;
  swatchClass?: string;
};

export type FilterGroup = {
  label: string;
  options: FilterOption[];
  value: string | null;
  onChange: (id: string | null) => void;
};

type Props = {
  groups: FilterGroup[];
};

export function PlaysFilterPopover({ groups }: Props) {
  const activeCount = groups.filter((group) => group.value !== null).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-2 h-9 px-3.5 rounded-full text-[13px] font-medium border transition-all",
            activeCount > 0
              ? "bg-foreground text-background border-foreground"
              : "bg-card text-foreground/80 border-border/60 hover:border-border",
          )}
        >
          <SlidersHorizontal className="size-3.5" strokeWidth={2} />
          Filter
          {activeCount > 0 ? (
            <span className="text-[11px] font-semibold tabular-nums bg-background/20 rounded-md px-1.5 py-0.5">
              {activeCount}
            </span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-4 rounded-2xl border-border/60 space-y-4">
        {groups.map((group) => (
          <div key={group.label}>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
                {group.label}
              </p>
              {group.value ? (
                <button
                  type="button"
                  onClick={() => group.onChange(null)}
                  className="text-[11px] text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              ) : null}
            </div>
            <div className="grid grid-cols-1 gap-1">
              {group.options.map((option) => {
                const active = group.value === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => group.onChange(active ? null : option.id)}
                    className={cn(
                      "w-full inline-flex items-center gap-2.5 h-9 px-2 rounded-xl text-[13px] font-medium transition",
                      active ? "bg-muted" : "hover:bg-muted/60",
                    )}
                  >
                    {option.monogram || option.swatchClass ? (
                      <span
                        className={cn(
                          "size-6 rounded-full grid place-items-center text-[10px] font-semibold",
                          option.swatchClass ?? "bg-muted text-foreground/70",
                        )}
                      >
                        {option.monogram}
                      </span>
                    ) : null}
                    <span className="flex-1 text-left">{option.label}</span>
                    {active ? <Check className="size-4 text-foreground" strokeWidth={2.5} /> : null}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </PopoverContent>
    </Popover>
  );
}
