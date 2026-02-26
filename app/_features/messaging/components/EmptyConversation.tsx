"use client";

import { MessageSquare, Mail, Link as LinkIcon, Users } from "lucide-react";
import { Button } from "@repo/ui";
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
  gmailConnected = false,
  onInviteToBridge,
  onConnectGmail,
  className,
}: EmptyConversationProps) {
  // Determine which empty state to show
  const isGeneral = conversationType === "general";
  const contactName = contact?.name ?? "this contact";
  const hasBridge = contact?.hasBridge ?? false;
  const hasEmail = contact?.hasEmail ?? false;

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
        <h3 className="text-lg font-medium">
          Start a conversation with {clientName ?? "your client"}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground max-w-sm">
          Messages here are visible to all team members. You can also email
          specific people.
        </p>
      </div>
    );
  }

  // DM - Contact on Bridge
  if (hasBridge) {
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
          Start a conversation with {contactName}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground max-w-sm">
          {contactName} will be notified in their Bridge portal.
          {hasEmail && gmailConnected && " You can also email them directly."}
        </p>
      </div>
    );
  }

  // DM - Contact NOT on Bridge but has email
  if (hasEmail && gmailConnected) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center h-full text-center px-6",
          className
        )}
      >
        <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Mail className="size-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium">Email {contactName}</h3>
        <p className="mt-2 text-sm text-muted-foreground max-w-sm">
          {contactName} isn&apos;t on Bridge yet. Send them an email or invite
          them for real-time messaging.
        </p>
        {onInviteToBridge && (
          <Button variant="outline" className="mt-4" onClick={onInviteToBridge}>
            <LinkIcon className="size-4" />
            Invite to Bridge
          </Button>
        )}
      </div>
    );
  }

  // DM - Contact has email but Gmail not connected (can still email if they connect)
  if (hasEmail && !gmailConnected) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center h-full text-center px-6",
          className
        )}
      >
        <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Mail className="size-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium">Connect Gmail to send emails</h3>
        <p className="mt-2 text-sm text-muted-foreground max-w-sm">
          {contactName} isn&apos;t on Bridge yet. Connect your Gmail to email
          them directly, or invite them to Bridge for real-time messaging.
        </p>
        <div className="flex gap-2 mt-4">
          {onConnectGmail && (
            <Button onClick={onConnectGmail}>
              <Mail className="size-4" />
              Connect Gmail
            </Button>
          )}
          {onInviteToBridge && (
            <Button variant="outline" onClick={onInviteToBridge}>
              <LinkIcon className="size-4" />
              Invite to Bridge
            </Button>
          )}
        </div>
      </div>
    );
  }

  // DM - Neither Bridge nor Email address exists
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
        Can&apos;t message {contactName} yet
      </h3>
      <p className="mt-2 text-sm text-muted-foreground max-w-sm">
        Add their email address or invite them to Bridge to start a
        conversation.
      </p>
      <div className="flex gap-2 mt-4">
        {onInviteToBridge && (
          <Button variant="outline" onClick={onInviteToBridge}>
            <LinkIcon className="size-4" />
            Invite to Bridge
          </Button>
        )}
      </div>
    </div>
  );
}
