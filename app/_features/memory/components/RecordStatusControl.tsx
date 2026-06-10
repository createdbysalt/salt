import { cn } from "@repo/utils";
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

export { RecordStatusControl } from "./AccountFieldEditors";
