"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Search as SearchIcon,
  MessageCircle,
  Sparkles,
  Mail,
  MessageSquare as SlackIcon,
  Phone,
  Zap,
  ChevronDown,
} from "lucide-react";
import { cn } from "@repo/utils";
import {
  Button,
  Skeleton,
  Badge,
  Card,
  AIButton,
} from "@repo/ui";
import { PlaysSectionHeader } from "@/app/_features/plays/components/PlaysSectionHeader";
import { SegmentedTabs } from "@/app/_features/shared/components/SegmentedTabs";
import { ConversationPanel, ConversationPanelEmpty } from "@/app/_features/messaging/components/ConversationPanel";
import type { Conversation as ConversationListItemShape } from "@/app/_features/messaging/components/ConversationListItem";
import type { ChatMessageData } from "@/app/_features/messaging/components/ChatMessage";
import type { MessageMode, ContactCapabilities } from "@/app/_features/messaging/components/SmartComposer";
import type { GmailAccount } from "@/app/_features/messaging/components/EmailFields";
import type { Conversation } from "@/app/actions/messaging/conversation-actions";
import { getMessages, sendMessage } from "@/app/_features/messaging/actions";
import { useMockContent } from "@/app/_features/shell/contexts/DashboardUserContext";

// ============================================================================
// Types
// ============================================================================

interface SendMessageData {
  content: string;
  mode: MessageMode;
  attachments?: Array<{ file: File; existingFileId?: string }>;
  emailData?: {
    fromAccountId: string;
    recipientIds: string[];
    subject: string;
    replyToThreadId?: string;
  };
}

interface PendingDraft {
  id: string;
  recipientId: string;
  recipientName: string;
  recipientAvatarUrl?: string;
  context: string;
  draftContent: string;
  channel: "portal" | "email" | "slack" | "whatsapp";
  createdAt: Date;
  priority: "high" | "medium" | "low";
}

interface ConversationsPageClientProps {
  initialConversations?: Conversation[];
  initialPendingDrafts?: PendingDraft[];
  gmailConnected?: boolean;
  gmailAccount?: GmailAccount;
}

// ============================================================================
// Channel Badge Component
// ============================================================================

function ChannelBadge({ channel }: { channel: "portal" | "email" | "slack" | "whatsapp" }) {
  const config = {
    portal: { icon: MessageCircle, label: "Portal", className: "bg-primary/10 text-primary" },
    email: { icon: Mail, label: "Email", className: "bg-info/10 text-info" },
    slack: { icon: SlackIcon, label: "Slack", className: "bg-warning/10 text-warning" },
    whatsapp: { icon: Phone, label: "WhatsApp", className: "bg-success/10 text-success" },
  };

  const { icon: Icon, label, className } = config[channel];

  return (
    <Badge variant="secondary" className={cn("gap-1 font-normal", className)}>
      <Icon className="size-3" />
      {label}
    </Badge>
  );
}

// ============================================================================
// Pending Draft Card Component
// ============================================================================

function PendingDraftCard({
  draft,
  onEdit,
  onDismiss,
  onApprove,
}: {
  draft: PendingDraft;
  onEdit: () => void;
  onDismiss: () => void;
  onApprove: () => void;
}) {
  const initials = draft.recipientName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Card className="p-4 hover:bg-muted/30 transition-colors">
      <div className="flex items-start gap-3">
        <div
          className="size-10 rounded-full bg-muted flex items-center justify-center shrink-0"
          style={{
            backgroundImage: draft.recipientAvatarUrl ? `url(${draft.recipientAvatarUrl})` : undefined,
            backgroundSize: "cover",
          }}
        >
          {!draft.recipientAvatarUrl && (
            <span className="text-xs font-medium text-muted-foreground">{initials}</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium truncate">{draft.recipientName}</span>
            <ChannelBadge channel={draft.channel} />
          </div>

          <p className="text-xs text-muted-foreground mb-2">{draft.context}</p>

          <div className="bg-muted/50 rounded-sm p-3 text-sm text-foreground/90 mb-3">
            &ldquo;{draft.draftContent}&rdquo;
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onEdit}>
              Edit
            </Button>
            <Button variant="ghost" size="sm" onClick={onDismiss}>
              Dismiss
            </Button>
            <AIButton size="sm" className="ml-auto" onClick={onApprove}>
              <Zap className="size-3.5" />
              Approve &amp; Send
            </AIButton>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ============================================================================
// Empty States
// ============================================================================

function EmptyPendingState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Sparkles className="size-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium mb-2">All caught up</h3>
      <p className="text-sm text-muted-foreground max-w-[280px]">
        No pending drafts. Your AI is standing by to help with your next conversation.
      </p>
    </div>
  );
}

function EmptyThreadsState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <MessageCircle className="size-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium mb-2">No conversations yet</h3>
      <p className="text-sm text-muted-foreground max-w-[280px]">
        Start a conversation from a person&apos;s detail page, or wait for incoming messages.
      </p>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

// Mock pending drafts for demo
const MOCK_PENDING_DRAFTS: PendingDraft[] = [
  {
    id: "draft-1",
    recipientId: "person-1",
    recipientName: "Sarah Chen",
    recipientAvatarUrl: undefined,
    context: "She asked about project timeline 2 hours ago",
    draftContent: "Hi Sarah, the updated timeline shows delivery by June 15. I've attached the revised Gantt chart for your review. Let me know if you have any questions about the milestones.",
    channel: "portal" as const,
    createdAt: new Date(),
    priority: "high" as const,
  },
  {
    id: "draft-2",
    recipientId: "person-2",
    recipientName: "Alex Rivera",
    recipientAvatarUrl: undefined,
    context: "Follow-up on partnership discussion from yesterday",
    draftContent: "Hey Alex, great chatting yesterday. I've drafted the MOU based on our discussion. The key terms are outlined in section 3. Let me know if anything needs adjustment.",
    channel: "email" as const,
    createdAt: new Date(),
    priority: "medium" as const,
  },
];

export function ConversationsPageClient({
  initialConversations = [],
  initialPendingDrafts = [],
  gmailConnected = false,
  gmailAccount,
}: ConversationsPageClientProps = {}) {
  const router = useRouter();
  const mockContent = useMockContent();

  // Tab state
  const [activeTab, setActiveTab] = React.useState<"pending" | "threads">("pending");

  // Conversations state
  const [conversations] = React.useState(initialConversations);
  const [pendingDrafts, setPendingDrafts] = React.useState<PendingDraft[]>(() =>
    initialPendingDrafts.length > 0
      ? initialPendingDrafts
      : mockContent
        ? MOCK_PENDING_DRAFTS
        : [],
  );
  const [selectedConversationId, setSelectedConversationId] = React.useState<string | null>(
    initialConversations[0]?.id ?? null
  );
  const [messages, setMessages] = React.useState<ChatMessageData[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  // Get selected conversation
  const selectedConversation = conversations.find((c) => c.id === selectedConversationId);

  // Filter conversations by search
  const filteredConversations = React.useMemo(() => {
    if (!searchQuery) return conversations;
    const query = searchQuery.toLowerCase();
    return conversations.filter(
      (conv) =>
        conv.clientName.toLowerCase().includes(query) ||
        conv.lastMessagePreview?.toLowerCase().includes(query)
    );
  }, [conversations, searchQuery]);

  // Map server conversations to list item format
  const conversationListItems: ConversationListItemShape[] = React.useMemo(() => {
    return filteredConversations.map((conv) => ({
      id: conv.id,
      type: "direct" as const,
      name: conv.clientName,
      avatarUrl: conv.clientAvatarUrl,
      lastMessagePreview: conv.lastMessagePreview,
      lastMessageAt: conv.lastMessageAt ? new Date(conv.lastMessageAt) : null,
      unreadCount: 0,
    }));
  }, [filteredConversations]);

  // Load messages when conversation changes
  React.useEffect(() => {
    async function loadMessages() {
      if (!selectedConversation) {
        setMessages([]);
        return;
      }

      setIsLoadingMessages(true);
      try {
        const result = await getMessages({ conversationId: selectedConversation.id });
        if ("error" in result) {
          console.error("Failed to load messages:", result.error);
          setMessages([]);
        } else {
          const chatMessages: ChatMessageData[] = result.data.messages
            .slice()
            .reverse()
            .map((msg) => ({
              id: msg.id,
              content: msg.content,
              createdAt: new Date(msg.createdAt),
              isFromMe: msg.senderType === "studio_user",
              senderName: msg.senderName,
              senderAvatarUrl: msg.senderAvatarUrl,
              status: "delivered" as const,
              channel: "table" as const,
            }));
          setMessages(chatMessages);
        }
      } catch (error) {
        console.error("Error loading messages:", error);
        setMessages([]);
      } finally {
        setIsLoadingMessages(false);
      }
    }

    loadMessages();
  }, [selectedConversation]);

  // Handle conversation selection
  const handleSelectConversation = (conversationId: string) => {
    setSelectedConversationId(conversationId);
  };

  // Handle send message
  const handleSendMessage = async (data: SendMessageData): Promise<{ error?: string } | void> => {
    if (!selectedConversation) {
      return { error: "No conversation selected" };
    }

    try {
      const result = await sendMessage({
        conversationId: selectedConversation.id,
        content: data.content,
      });

      if ("error" in result) {
        return { error: result.error };
      }

      const newMessage: ChatMessageData = {
        id: result.data.id,
        content: result.data.content,
        createdAt: new Date(result.data.createdAt),
        isFromMe: true,
        senderName: result.data.senderName,
        senderAvatarUrl: result.data.senderAvatarUrl,
        status: "delivered" as const,
        channel: "table" as const,
      };
      setMessages((prev) => [...prev, newMessage]);

      return;
    } catch (error) {
      console.error("Error sending message:", error);
      return { error: "Failed to send message" };
    }
  };

  // Handle draft actions
  const handleEditDraft = (draftId: string) => {
    console.log("Edit draft:", draftId);
  };

  const handleDismissDraft = (draftId: string) => {
    setPendingDrafts((prev) => prev.filter((d) => d.id !== draftId));
  };

  const handleApproveDraft = (draftId: string) => {
    console.log("Approve draft:", draftId);
    setPendingDrafts((prev) => prev.filter((d) => d.id !== draftId));
  };

  // Build contact for selected conversation
  const selectedContact: ContactCapabilities | undefined = selectedConversation
    ? {
        hasBridge: true,
        hasEmail: true,
        email: undefined,
      }
    : undefined;

  const tabs = [
    { id: "pending" as const, label: "Pending" },
    { id: "threads" as const, label: "Threads" },
  ];

  return (
    <div className="-mx-4 -my-5 flex min-h-[calc(100vh-4rem)] flex-col lg:-mx-10 lg:-my-8">
      {activeTab === "pending" ? (
        <div className="relative min-h-full flex-1">
          <div aria-hidden className="salt-ambient-wash" />
          <div className="mx-auto w-full max-w-[1400px] space-y-8 px-4 py-8 lg:px-10">
            <SegmentedTabs
              active={activeTab}
              onChange={setActiveTab}
              tabs={tabs}
              layoutId="convos-tab-pill"
              ariaLabel="Conversations sections"
            />
            <PlaysSectionHeader
              eyebrow="Convos"
              title="Pending drafts"
              description="AI-drafted replies waiting for your approval. Nothing sends without you."
            />
            {pendingDrafts.length === 0 ? (
              <EmptyPendingState />
            ) : (
              <div className="space-y-4">
                {pendingDrafts.map((draft) => (
                  <PendingDraftCard
                    key={draft.id}
                    draft={draft}
                    onEdit={() => handleEditDraft(draft.id)}
                    onDismiss={() => handleDismissDraft(draft.id)}
                    onApprove={() => handleApproveDraft(draft.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-card">
          <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border/60 px-4 py-3 lg:px-6">
            <SegmentedTabs
              active={activeTab}
              onChange={setActiveTab}
              tabs={tabs}
              layoutId="convos-tab-pill"
              ariaLabel="Conversations sections"
            />
            <p className="hidden text-xs text-muted-foreground sm:block">
              Unified inbox across portal, email, and connected channels
            </p>
          </div>

          <div className="flex min-h-0 flex-1 overflow-hidden">
            <aside className="flex h-full w-full shrink-0 flex-col border-r border-border/60 bg-muted/40 dark:bg-muted/20 lg:w-[300px]">
              <div className="flex shrink-0 flex-col gap-3 border-b border-border/60 px-4 pb-3 pt-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-lg leading-none tracking-tight text-foreground">
                    Your inbox
                  </h2>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Newest
                    <ChevronDown className="size-3" strokeWidth={2.5} />
                  </button>
                </div>
                <div className="relative">
                  <SearchIcon
                    className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
                    strokeWidth={2}
                  />
                  <input
                    type="text"
                    placeholder="Search conversations"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-9 w-full rounded-full border border-border/60 bg-card pl-9 pr-3 text-sm transition placeholder:text-muted-foreground focus:border-foreground/40 focus:outline-none"
                  />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-1 font-medium text-foreground/80">
                    {conversationListItems.length} Open{" "}
                    <ChevronDown className="size-3" strokeWidth={2.5} />
                  </span>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto">
                {conversationListItems.length === 0 ? (
                  <EmptyThreadsState />
                ) : (
                  <ul>
                    {conversationListItems.map((conversation) => {
                      const active = selectedConversationId === conversation.id;
                      const initials = conversation.name
                        .split(" ")
                        .map((part: string) => part[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2);
                      return (
                        <li key={conversation.id}>
                          <button
                            type="button"
                            onClick={() => handleSelectConversation(conversation.id)}
                            className={cn(
                              "relative block w-full border-b border-border/40 px-4 py-3 text-left transition",
                              active ? "bg-background" : "hover:bg-background/60"
                            )}
                          >
                            {active && (
                              <span className="absolute bottom-0 left-0 top-0 w-0.5 bg-foreground" />
                            )}
                            <div className="flex min-w-0 items-start gap-2.5">
                              <div className="grid size-8 shrink-0 place-items-center rounded-full bg-foreground text-[10px] font-semibold text-background">
                                {initials}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-baseline justify-between gap-2">
                                  <p className="truncate text-sm font-medium text-foreground/90">
                                    {conversation.name}
                                  </p>
                                  {conversation.lastMessageAt && (
                                    <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                                      {conversation.lastMessageAt.toLocaleDateString(undefined, {
                                        month: "short",
                                        day: "numeric",
                                      })}
                                    </span>
                                  )}
                                </div>
                                {conversation.lastMessagePreview && (
                                  <p className="mt-0.5 line-clamp-1 text-xs leading-snug text-muted-foreground">
                                    {conversation.lastMessagePreview}
                                  </p>
                                )}
                              </div>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </aside>

            <div className="hidden min-w-0 flex-1 lg:flex">
              {selectedConversation ? (
                <ConversationPanel
                  conversation={{
                    id: selectedConversation.id,
                    type: "direct",
                    name: selectedConversation.clientName,
                    avatarUrl: selectedConversation.clientAvatarUrl,
                    lastMessagePreview: selectedConversation.lastMessagePreview,
                    lastMessageAt: selectedConversation.lastMessageAt,
                  }}
                  messages={messages}
                  isLoading={isLoadingMessages}
                  onSendMessage={handleSendMessage}
                  clientId={selectedConversation.clientId}
                  contact={selectedContact}
                  gmailConnected={gmailConnected}
                  gmailAccounts={gmailAccount ? [gmailAccount] : []}
                  onConnectGmail={() => router.push("/settings?section=integrations")}
                  className="h-full"
                />
              ) : (
                <ConversationPanelEmpty className="h-full" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
