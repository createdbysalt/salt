"use client";

import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage, Card } from "@repo/ui";
import { cn } from "@repo/utils";
import { ChannelBadge, type MessageChannel } from "./ChannelBadge";
import { DeliveryStatus, type DeliveryStatusType } from "./DeliveryStatus";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { Paperclip } from "lucide-react";

export interface UnifiedMessage {
  id: string;
  content: string;
  channel: MessageChannel;
  direction: "inbound" | "outbound";
  senderName: string;
  senderAvatarUrl?: string;
  senderEmail?: string;
  createdAt: Date;
  deliveryStatus?: DeliveryStatusType;
  attachments?: {
    id: string;
    name: string;
    size: number;
    type: string;
    url: string;
  }[];
}

interface UnifiedMessageCardProps {
  message: UnifiedMessage;
  className?: string;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function UnifiedMessageCard({ message, className }: UnifiedMessageCardProps) {
  const isOutbound = message.direction === "outbound";

  return (
    <div className={cn("group", className)}>
      {/* Channel + Time Header */}
      <div className="flex items-center gap-2 mb-2">
        <ChannelBadge channel={message.channel} />
        <span className="text-xs text-muted-foreground">
          {format(message.createdAt, "h:mm a")}
        </span>
      </div>

      {/* Message Card */}
      <Card className={cn(
        "p-4",
        isOutbound && "bg-primary/5 border-primary/20"
      )}>
        {/* Sender Row */}
        <div className="flex items-start gap-3">
          <Avatar className="size-8 shrink-0">
            <AvatarImage src={message.senderAvatarUrl} alt={message.senderName} />
            <AvatarFallback className="text-xs">
              {getInitials(message.senderName)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            {/* Sender Name + Email */}
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-medium">
                {isOutbound ? "You" : message.senderName}
              </span>
              {message.channel === "email" && message.senderEmail && (
                <span className="text-xs text-muted-foreground truncate">
                  {isOutbound ? `→ ${message.senderEmail}` : message.senderEmail}
                </span>
              )}
            </div>

            {/* Message Content */}
            <div className="mt-1 text-sm">
              <MarkdownRenderer content={message.content} />
            </div>

            {/* Attachments */}
            {message.attachments && message.attachments.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {message.attachments.map((attachment) => (
                  <a
                    key={attachment.id}
                    href={attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-md border bg-card px-3 py-1.5 text-xs hover:bg-muted transition-colors"
                  >
                    <Paperclip className="size-3 text-muted-foreground" />
                    <span className="truncate max-w-[150px]">{attachment.name}</span>
                    <span className="text-muted-foreground">
                      {formatFileSize(attachment.size)}
                    </span>
                  </a>
                ))}
              </div>
            )}

            {/* Delivery Status (outbound only) */}
            {isOutbound && message.deliveryStatus && (
              <div className="mt-2">
                <DeliveryStatus status={message.deliveryStatus} />
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
