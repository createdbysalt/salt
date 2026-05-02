"use client";

import { MessageSquare, Inbox } from "lucide-react";

interface MessageEmptyProps {
  variant: "no-conversations" | "select-conversation";
}

export function MessageEmpty({ variant }: MessageEmptyProps) {
  if (variant === "no-conversations") {
    return (
      <div className="flex flex-col items-center justify-center text-center p-8">
        <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Inbox className="size-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium">No messages yet</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          Your studio team will reach out when they have updates for you.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center p-8">
      <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <MessageSquare className="size-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium">Select a conversation</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm">
        Choose a conversation from the list to view messages.
      </p>
    </div>
  );
}
