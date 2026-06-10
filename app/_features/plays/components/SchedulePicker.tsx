import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui";
import { Calendar, Sunrise, Sun, Coffee, CalendarClock } from "lucide-react";
import { cn } from "@repo/utils";
import { useState } from "react";

export type ScheduleChoice = {
  id: string;
  label: string;
  hint: string;
};

const PRESETS: { id: string; label: string; hint: string; icon: typeof Sun }[] = [
  { id: "later", label: "Later today", hint: "5:00 PM", icon: Coffee },
  { id: "tmr-am", label: "Tomorrow morning", hint: "Tue, 9:00 AM", icon: Sunrise },
  { id: "tmr-pm", label: "Tomorrow afternoon", hint: "Tue, 2:00 PM", icon: Sun },
  { id: "fri", label: "Friday morning", hint: "Fri, 9:00 AM", icon: CalendarClock },
  { id: "mon", label: "Next Monday", hint: "Mon, 9:00 AM", icon: Calendar },
];

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSchedule: (choice: ScheduleChoice) => void;
  children: React.ReactNode;
};

export function SchedulePicker({ open, onOpenChange, onSchedule, children }: Props) {
  const [hover, setHover] = useState<string | null>(null);

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent side="top" align="center" className="w-72 p-3 rounded-2xl border-border/60">
        <div className="px-2 pb-2 pt-1">
          <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
            Send this play later
          </p>
          <p className="text-[11px] text-muted-foreground/80 mt-0.5">
            Salt will hold the draft until then.
          </p>
        </div>
        <div className="flex flex-col gap-0.5">
          {PRESETS.map((p) => {
            const Icon = p.icon;
            return (
              <button
                key={p.id}
                onMouseEnter={() => setHover(p.id)}
                onMouseLeave={() => setHover(null)}
                onClick={() => onSchedule({ id: p.id, label: p.label, hint: p.hint })}
                className={cn(
                  "w-full flex items-center gap-3 h-11 px-2.5 rounded-xl text-left transition",
                  hover === p.id ? "bg-muted" : "hover:bg-muted/60"
                )}
              >
                <span className="size-8 rounded-xl grid place-items-center bg-muted text-foreground/70">
                  <Icon className="size-4" strokeWidth={2} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[13px] font-medium leading-tight">{p.label}</span>
                  <span className="block text-[11px] text-muted-foreground tabular-nums mt-0.5">{p.hint}</span>
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-2 pt-2 border-t border-border/50">
          <button
            onClick={() => onSchedule({ id: "custom", label: "Custom time", hint: "Pick a date" })}
            className="w-full inline-flex items-center justify-center gap-2 h-9 rounded-xl text-[12px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition"
          >
            <Calendar className="size-3.5" strokeWidth={2} />
            Pick a custom time
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
