import { cn } from "@repo/utils";
import { Popover, PopoverTrigger, PopoverContent } from "@repo/ui";
import { Check, ChevronDown } from "lucide-react";
import type { RecordStatus } from "@/app/_lib/demo/people-demo-data";
import { RECORD_STATUS_OPTIONS } from "./AccountFieldEditors";

const HERO_CHIP: Record<Exclude<RecordStatus, "active">, string> = {
  inactive: "bg-white/10 text-white/75 backdrop-blur border-white/15",
};

export function RecordStatusChip({
  status,
  className,
}: {
  status: RecordStatus;
  className?: string;
}) {
  if (status === "active") return null;

  const label = RECORD_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;

  return (
    <span className={cn("chip backdrop-blur", HERO_CHIP[status], className)}>
      <span className="size-1.5 rounded-full bg-white/50" />
      {label}
    </span>
  );
}

export function HeroRecordStatusSelect({
  value,
  onChange,
  className,
}: {
  value: RecordStatus;
  onChange: (status: RecordStatus) => void;
  className?: string;
}) {
  const currentOption = RECORD_STATUS_OPTIONS.find((o) => o.value === value);
  const label = currentOption?.label ?? value;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "chip bg-white/15 text-white/90 backdrop-blur border-white/20 cursor-pointer hover:bg-white/25 transition-colors",
            className
          )}
        >
          <span
            className={cn(
              "size-1.5 rounded-full",
              value === "active" ? "bg-emerald-400 animate-pulse-glow" : "bg-white/50"
            )}
          />
          {label}
          <ChevronDown className="size-3 ml-0.5 opacity-70" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-36 p-1"
        sideOffset={6}
      >
        {RECORD_STATUS_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors",
              "hover:bg-muted focus:bg-muted focus:outline-none",
              value === option.value && "font-medium"
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                option.value === "active" ? "bg-emerald-500" : "bg-muted-foreground/40"
              )}
            />
            {option.label}
            {value === option.value && <Check className="size-3.5 ml-auto opacity-70" />}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

export { RecordStatusControl } from "./AccountFieldEditors";
