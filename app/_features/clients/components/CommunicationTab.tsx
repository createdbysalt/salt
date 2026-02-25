"use client";

import * as React from "react";
import { cn } from "@repo/utils";
import { ConversationSidebar } from "@/app/_features/messaging/components/ConversationSidebar";
import { ConversationPanel, ConversationPanelEmpty } from "@/app/_features/messaging/components/ConversationPanel";
import { NoBridgeUsersDialog } from "@/app/_features/messaging/components/NoBridgeUsersDialog";
import type { Conversation } from "@/app/_features/messaging/components/ConversationListItem";
import type { ChatMessageData } from "@/app/_features/messaging/components/ChatMessage";
import type { BridgeStatus } from "@/app/_features/messaging/components/BridgeStatusBanner";

interface CommunicationTabProps {
  clientId: string;
  clientName: string;
  clientEmail?: string;
  bridgeStatus: BridgeStatus;
  conversations: Conversation[];
  messages: ChatMessageData[];
  isLoadingConversations?: boolean;
  isLoadingMessages?: boolean;
  hasMoreMessages?: boolean;
  isLoadingMoreMessages?: boolean;
  onLoadMoreMessages?: () => void;
  onSelectConversation?: (conversation: Conversation) => void;
  onNewConversation?: () => void;
  onSendMessage: (content: string) => Promise<{ error?: string } | void>;
  onInviteToBridge?: () => void;
  className?: string;
}

export function CommunicationTab({
  clientId,
  clientName,
  clientEmail,
  bridgeStatus,
  conversations,
  messages,
  isLoadingConversations = false,
  isLoadingMessages = false,
  hasMoreMessages = false,
  isLoadingMoreMessages = false,
  onLoadMoreMessages,
  onSelectConversation,
  onNewConversation,
  onSendMessage,
  onInviteToBridge,
  className,
}: CommunicationTabProps) {
  const [selectedConversationId, setSelectedConversationId] = React.useState<string | undefined>(
    conversations[0]?.id
  );
  const [showNoBridgeDialog, setShowNoBridgeDialog] = React.useState(false);
  const [pendingMessage, setPendingMessage] = React.useState<string | null>(null);

  // Get selected conversation
  const selectedConversation = conversations.find((c) => c.id === selectedConversationId);

  // Handle conversation selection
  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversationId(conversation.id);
    onSelectConversation?.(conversation);
  };

  // Handle send - check if Bridge users exist first
  const handleSendMessage = async (content: string) => {
    // If no Bridge users and this is a new conversation or general channel
    if (bridgeStatus !== "active") {
      setPendingMessage(content);
      setShowNoBridgeDialog(true);
      return;
    }

    return onSendMessage(content);
  };

  // Handle sending via email after dialog
  const handleSendViaEmail = () => {
    setShowNoBridgeDialog(false);
    if (pendingMessage) {
      onSendMessage(pendingMessage);
      setPendingMessage(null);
    }
  };

  // Handle invite to Bridge after dialog
  const handleInviteToBridge = () => {
    setShowNoBridgeDialog(false);
    setPendingMessage(null);
    onInviteToBridge?.();
  };

  return (
    <>
      <div className={cn("flex h-full", className)}>
        {/* Left Sidebar - Conversation List */}
        <ConversationSidebar
          conversations={conversations}
          selectedId={selectedConversationId}
          onSelect={handleSelectConversation}
          onNewConversation={onNewConversation}
          isLoading={isLoadingConversations}
          className="w-[280px] shrink-0"
        />

        {/* Right Panel - Selected Conversation */}
        {selectedConversation ? (
          <ConversationPanel
            conversation={selectedConversation}
            messages={messages}
            isLoading={isLoadingMessages}
            hasMore={hasMoreMessages}
            isLoadingMore={isLoadingMoreMessages}
            onLoadMore={onLoadMoreMessages}
            onSendMessage={handleSendMessage}
            className="flex-1"
          />
        ) : (
          <ConversationPanelEmpty className="flex-1" />
        )}
      </div>

      {/* No Bridge Users Dialog */}
      <NoBridgeUsersDialog
        open={showNoBridgeDialog}
        onOpenChange={setShowNoBridgeDialog}
        clientName={clientName}
        onSendViaEmail={handleSendViaEmail}
        onInviteToBridge={handleInviteToBridge}
      />
    </>
  );
}
