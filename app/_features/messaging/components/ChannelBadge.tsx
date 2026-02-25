"use client";

import { Mail, MessageSquare } from "lucide-react";
import { Badge } from "@repo/ui";
import { cn } from "@repo/utils";

export type MessageChannel = "bridge" | "email";

interface ChannelBadgeProps {
  channel: MessageChannel;
  className?: string;
}

export function ChannelBadge({ channel, className }: ChannelBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 text-xs font-normal",
        channel === "bridge" && "border-primary/30 bg-primary/5 text-primary",
        channel === "email" && "border-amber-500/30 bg-amber-500/5 text-amber-600",
        className
      )}
    >
      {channel === "bridge" ? (
        <>
          <MessageSquare className="size-3" />
          Bridge
        </>
      ) : (
        <>
          <Mail className="size-3" />
          Email
        </>
      )}
    </Badge>
  );
}
