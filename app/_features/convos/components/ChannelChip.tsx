import { cn } from "@repo/utils";
import { CHANNEL_META, type Channel } from "../data";

export function ChannelChip({
  channel,
  size = "sm",
  showLabel = true,
}: {
  channel: Channel;
  size?: "xs" | "sm";
  showLabel?: boolean;
}) {
  const meta = CHANNEL_META[channel];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-medium",
        size === "xs" ? "px-1.5 py-0 text-[10px]" : "px-2 py-0.5 text-[11px]",
        meta.tone,
      )}
    >
      <span className={cn("size-1.5 rounded-full", meta.dotClass)} />
      {showLabel && meta.label}
    </span>
  );
}

export function ChannelDotStack({
  channels,
  activeChannel,
}: {
  channels: Channel[];
  activeChannel?: Channel;
}) {
  return (
    <div className="inline-flex items-center gap-0.5">
      {channels.map((c) => {
        const meta = CHANNEL_META[c];
        const active = c === activeChannel;
        return (
          <span
            key={c}
            title={meta.label}
            className={cn(
              "size-1.5 rounded-full transition-opacity",
              meta.dotClass,
              active ? "opacity-100" : "opacity-35",
            )}
          />
        );
      })}
    </div>
  );
}
