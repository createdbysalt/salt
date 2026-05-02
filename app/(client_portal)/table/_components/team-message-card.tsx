"use client";

import { Pin, X } from "lucide-react";
import { Card, CardContent, Avatar, AvatarFallback, AvatarImage, Button } from "@repo/ui";
import { formatDistanceToNow } from "date-fns";
import type { BridgeTeamMessage } from "@/app/_lib/table/queries";

interface TeamMessageCardProps {
  message: BridgeTeamMessage;
  onDismiss?: () => void;
}

export function TeamMessageCard({ message, onDismiss }: TeamMessageCardProps) {
  const initials = message.authorName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex items-center gap-2 text-primary">
            <Pin className="size-4" />
            <span className="text-xs font-medium uppercase tracking-wide">
              Message from your team
            </span>
          </div>
          {onDismiss && (
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto -mr-2 -mt-1 size-8 text-muted-foreground hover:text-foreground"
              onClick={onDismiss}
            >
              <X className="size-4" />
              <span className="sr-only">Dismiss</span>
            </Button>
          )}
        </div>
        <div className="mt-3 flex items-start gap-3">
          <Avatar className="size-8">
            <AvatarImage src={message.authorAvatarUrl || undefined} />
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-1">
            <p className="text-sm leading-relaxed">&ldquo;{message.message}&rdquo;</p>
            <p className="text-xs text-muted-foreground">
              — {message.authorName} &middot;{" "}
              {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
