"use client";

import { Mail, MessageSquare } from "lucide-react";
import { Badge } from "@repo/ui";
import { cn } from "@repo/utils";

export type MessageChannel = "table" | "email";

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
        channel === "table" && "border-primary/30 bg-primary/5 text-primary",
        channel === "email" && "border-warning/30 bg-warning/5 text-warning",
        className
      )}
    >
      {channel === "table" ? (
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
