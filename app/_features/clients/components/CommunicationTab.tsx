"use client";

import * as React from "react";
import { cn } from "@repo/utils";
import { ConversationSidebar } from "@/app/_features/messaging/components/ConversationSidebar";
import { ConversationPanel, ConversationPanelEmpty } from "@/app/_features/messaging/components/ConversationPanel";
import { NoBridgeUsersDialog } from "@/app/_features/messaging/components/NoBridgeUsersDialog";
import type { Conversation } from "@/app/_features/messaging/components/ConversationListItem";
import type { ChatMessageData } from "@/app/_features/messaging/components/ChatMessage";
import type { BridgeStatus } from "@/app/_features/messaging/components/BridgeStatusBanner";
import type { MessageMode, ContactCapabilities } from "@/app/_features/messaging/components/SmartComposer";
import type { GmailAccount } from "@/app/_features/messaging/components/EmailFields";

interface SendMessageData {
  content: string;
  mode: MessageMode;
  attachments?: File[];
  emailData?: {
    fromAccountId: string;
    recipientIds: string[];
    subject: string;
    replyToThreadId?: string;
  };
}

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
  onSendMessage: (data: SendMessageData) => Promise<{ error?: string } | void>;
  onDeleteMessage?: (messageId: string, deleteForEveryone: boolean) => void;
  onInviteToBridge?: () => void;
  onConnectGmail?: () => void;
  onAddEmail?: () => void;
  onClearChat?: (conversationId: string) => void;
  onEditContact?: (contactId: string) => void;
  // Smart composer props
  contact?: ContactCapabilities;
  contacts?: (ContactCapabilities & { id: string; name: string })[];
  gmailConnected?: boolean;
  gmailAccounts?: GmailAccount[];
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
  onDeleteMessage,
  onInviteToBridge,
  onConnectGmail,
  onAddEmail,
  onClearChat,
  onEditContact,
  contact,
  contacts,
  gmailConnected = false,
  gmailAccounts = [],
  className,
}: CommunicationTabProps) {
  const [selectedConversationId, setSelectedConversationId] = React.useState<string | undefined>(
    conversations[0]?.id
  );
  const [showNoBridgeDialog, setShowNoBridgeDialog] = React.useState(false);
  const [pendingMessage, setPendingMessage] = React.useState<SendMessageData | null>(null);

  // Get selected conversation
  const selectedConversation = conversations.find((c) => c.id === selectedConversationId);

  // Get the contact for the selected conversation (for DMs)
  // DM conversation IDs have format "dm-{contactId}"
  const selectedContact = React.useMemo(() => {
    if (!selectedConversation || selectedConversation.type !== "direct") {
      return undefined;
    }
    // Extract contact ID from conversation ID (strip "dm-" prefix)
    const contactId = selectedConversation.id.replace(/^dm-/, "");
    // Find the contact that matches this conversation
    const matchingContact = contacts?.find((c) => c.id === contactId);
    if (matchingContact) {
      return matchingContact;
    }
    // Fallback: use the passed contact prop if no match found
    return contact;
  }, [selectedConversation, contacts, contact]);

  // Handle conversation selection
  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversationId(conversation.id);
    onSelectConversation?.(conversation);
  };

  // Handle send - check if Bridge users exist first for bridge messages
  const handleSendMessage = async (data: SendMessageData) => {
    // If sending via Bridge but no Bridge users, show dialog
    if (data.mode === "message" && bridgeStatus !== "active") {
      setPendingMessage(data);
      setShowNoBridgeDialog(true);
      return;
    }

    return onSendMessage(data);
  };

  // Handle sending via email after dialog
  const handleSendViaEmail = () => {
    setShowNoBridgeDialog(false);
    if (pendingMessage) {
      // Convert to email mode
      onSendMessage({ ...pendingMessage, mode: "email" });
      setPendingMessage(null);
    }
  };

  // Handle invite to Bridge after dialog
  const handleInviteToBridge = () => {
    setShowNoBridgeDialog(false);
    setPendingMessage(null);
    onInviteToBridge?.();
  };

  // Handle clear chat
  const handleClearChat = () => {
    if (selectedConversationId) {
      onClearChat?.(selectedConversationId);
    }
  };

  // Handle edit contact (for DMs)
  const handleEditContact = () => {
    if (selectedConversation?.type === "direct") {
      // Extract contact ID from conversation ID (strip "dm-" prefix)
      const contactId = selectedConversation.id.replace(/^dm-/, "");
      onEditContact?.(contactId);
    }
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
            onDeleteMessage={onDeleteMessage}
            contact={selectedContact}
            contacts={contacts}
            gmailConnected={gmailConnected}
            gmailAccounts={gmailAccounts}
            onConnectGmail={onConnectGmail}
            onInviteToBridge={onInviteToBridge}
            onAddEmail={onAddEmail}
            onClearChat={handleClearChat}
            onEditContact={handleEditContact}
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
