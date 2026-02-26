"use client";

import { MessageSquare, Users } from "lucide-react";
import { cn } from "@repo/utils";

type ConversationType = "general" | "direct";

interface ContactCapabilities {
  hasBridge: boolean;
  hasEmail: boolean;
  name?: string;
}

interface EmptyConversationProps {
  conversationType: ConversationType;
  clientName?: string;
  contact?: ContactCapabilities;
  gmailConnected?: boolean;
  onInviteToBridge?: () => void;
  onConnectGmail?: () => void;
  className?: string;
}

export function EmptyConversation({
  conversationType,
  clientName,
  contact,
  className,
}: EmptyConversationProps) {
  const isGeneral = conversationType === "general";

  // General Channel - Empty
  if (isGeneral) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center h-full text-center px-6",
          className
        )}
      >
        <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Users className="size-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium">Start the conversation</h3>
        <p className="mt-2 text-sm text-muted-foreground max-w-sm">
          Messages here are visible to all contacts for {clientName ?? "this client"}.
          Send an email to everyone at once.
        </p>
      </div>
    );
  }

  // DM - Simple "Start a conversation" message
  // The SmartComposer handles all capability checks with dialogs
  const displayName = contact?.name || clientName || "this contact";

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center h-full text-center px-6",
        className
      )}
    >
      <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <MessageSquare className="size-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium">
        Start a conversation with {displayName}
      </h3>
      <p className="mt-2 text-sm text-muted-foreground max-w-sm">
        Send a message or email to begin the conversation.
      </p>
    </div>
  );
}
