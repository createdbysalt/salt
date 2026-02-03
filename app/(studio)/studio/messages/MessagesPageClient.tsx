"use client";

import { useState, useCallback, useTransition, useRef } from "react";
import { MessageSquare } from "lucide-react";
import { PageGreetingHeader } from "@/app/_components/patterns/page-greeting-header";
import { ConversationListItem } from "@/app/_features/messaging/components/ConversationListItem";
import { MessageThread } from "@/app/_features/messaging/components/MessageThread";
import { MessageComposer } from "@/app/_features/messaging/components/MessageComposer";
import { MessageSearchInput } from "@/app/_features/messaging/components/MessageSearchInput";
import { MessageSearchResults } from "@/app/_features/messaging/components/MessageSearchResults";
import { SearchFilters } from "@/app/_features/messaging/components/SearchFilters";
import type { SearchFiltersState } from "@/app/_features/messaging/components/SearchFilters";
import { NewChatModal } from "@/app/_features/messaging/components/NewChatModal";
import { Card, CardContent } from "@/app/_components/ui/card";
import { Button } from "@/app/_components/ui/button";
import {
  sendMessage,
  getMessages,
  markMessagesAsRead,
  searchMessagesFullText,
  getConversationById,
} from "@/app/_features/messaging/actions";
import type {
  Conversation,
  Message,
  UnreadCounts,
  FullTextSearchResult,
  MessageParticipant,
} from "@/app/_features/messaging/types";
import {
  useRealtimeMessages,
  useRealtimeConversations,
} from "@/app/_features/messaging/hooks";
import type { ConversationUpdate } from "@/app/_features/messaging/hooks";

// ============================================================================
// Types
// ============================================================================

interface MessagesPageClientProps {
  conversations: Conversation[];
  unreadCounts: UnreadCounts;
  currentUserId: string;
  studioId: string;
  participants: MessageParticipant[];
}

// ============================================================================
// Empty State Component
// ============================================================================

function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
      <div className="bg-muted/50 rounded-full p-4 mb-4">
        <MessageSquare className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium mb-1">No messages yet</h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        Start a conversation with a client from their profile page to begin
        messaging.
      </p>
    </div>
  );
}

// ============================================================================
// Conversation List Component
// ============================================================================

function ConversationList({
  conversations,
  unreadCounts,
  activeConversationId,
  onSelect,
}: {
  conversations: Conversation[];
  unreadCounts: UnreadCounts;
  activeConversationId: string | null;
  onSelect: (conversation: Conversation) => void;
}) {
  if (conversations.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="flex flex-col gap-1 p-2">
      {conversations.map((conversation) => (
        <ConversationListItem
          key={conversation.id}
          id={conversation.id}
          name={conversation.clientName}
          avatarUrl={conversation.clientAvatarUrl}
          lastMessagePreview={conversation.lastMessagePreview}
          lastMessageAt={conversation.lastMessageAt}
          unreadCount={unreadCounts.byConversation[conversation.id] || 0}
          isActive={conversation.id === activeConversationId}
          onClick={() => onSelect(conversation)}
        />
      ))}
    </div>
  );
}

// ============================================================================
// Thread View Component
// ============================================================================

function ThreadView({
  conversation,
  messages,
  isLoading,
  isLoadingMore,
  hasMore,
  currentUserId,
  onLoadMore,
  onSend,
}: {
  conversation: Conversation;
  messages: Message[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  currentUserId: string;
  onLoadMore: () => void;
  onSend: (content: string) => Promise<{ error?: string } | void>;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border px-4 py-3">
        <h2 className="font-medium">{conversation.clientName}</h2>
      </div>

      {/* Messages */}
      <MessageThread
        messages={messages}
        currentUserId={currentUserId}
        isLoading={isLoading}
        isLoadingMore={isLoadingMore}
        hasMore={hasMore}
        onLoadMore={onLoadMore}
        className="flex-1"
      />

      {/* Composer */}
      <div className="border-t border-border p-4">
        <MessageComposer onSend={onSend} />
      </div>
    </div>
  );
}

// ============================================================================
// Thread Placeholder Component
// ============================================================================

function ThreadPlaceholder() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
      <div className="bg-muted/50 rounded-full p-4 mb-4">
        <MessageSquare className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium mb-1">Select a conversation</h3>
      <p className="text-sm text-muted-foreground">
        Choose a conversation from the list to view messages.
      </p>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function MessagesPageClient({
  conversations: initialConversations,
  unreadCounts: initialUnreadCounts,
  currentUserId,
  studioId,
  participants,
}: MessagesPageClientProps) {
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [unreadCounts, setUnreadCounts] = useState<UnreadCounts>(initialUnreadCounts);
  const [activeConversation, setActiveConversation] =
    useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [, startTransition] = useTransition();

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FullTextSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchMode, setIsSearchMode] = useState(false);

  // Filter state - stored in ref to avoid re-render triggering search
  const filtersRef = useRef<SearchFiltersState>({
    fromDate: "",
    toDate: "",
    senderId: "",
  });

  // ========================================================================
  // Realtime: Messages
  // ========================================================================

  // Handle new messages received via realtime
  const handleRealtimeMessage = useCallback(
    (newMessage: Message) => {
      // Only add if not sent by current user (we already add those optimistically)
      if (newMessage.senderId !== currentUserId) {
        setMessages((prev) => {
          // Avoid duplicates
          if (prev.some((m) => m.id === newMessage.id)) {
            return prev;
          }
          // Add to beginning (newest first)
          return [newMessage, ...prev];
        });

        // Update unread count for this conversation
        if (activeConversation?.id === newMessage.conversationId) {
          // Mark as read immediately since user is viewing this conversation
          startTransition(async () => {
            await markMessagesAsRead({ conversationId: newMessage.conversationId });
          });
        } else {
          // Increment unread count
          setUnreadCounts((prev) => ({
            total: prev.total + 1,
            byConversation: {
              ...prev.byConversation,
              [newMessage.conversationId]:
                (prev.byConversation[newMessage.conversationId] || 0) + 1,
            },
          }));
        }
      }
    },
    [currentUserId, activeConversation?.id]
  );

  // Subscribe to realtime messages for the active conversation
  useRealtimeMessages({
    conversationId: activeConversation?.id || "",
    onNewMessage: handleRealtimeMessage,
    enabled: !!activeConversation,
  });

  // ========================================================================
  // Realtime: Conversations
  // ========================================================================

  // Handle conversation updates (new message received)
  const handleConversationUpdate = useCallback(
    (update: ConversationUpdate) => {
      setConversations((prev) => {
        const updatedConversations = prev.map((conv) => {
          if (conv.id === update.id) {
            return {
              ...conv,
              lastMessageAt: update.lastMessageAt,
              lastMessagePreview: update.lastMessagePreview,
              updatedAt: update.updatedAt,
            };
          }
          return conv;
        });

        // Re-sort by last_message_at (newest first)
        return updatedConversations.sort((a, b) => {
          if (!a.lastMessageAt && !b.lastMessageAt) return 0;
          if (!a.lastMessageAt) return 1;
          if (!b.lastMessageAt) return -1;
          return b.lastMessageAt.getTime() - a.lastMessageAt.getTime();
        });
      });
    },
    []
  );

  // Subscribe to realtime conversation updates
  useRealtimeConversations({
    studioId,
    onConversationUpdate: handleConversationUpdate,
    enabled: true,
  });

  // ========================================================================
  // Message Loading
  // ========================================================================

  // Load messages for a conversation
  const loadMessages = useCallback(
    async (conversationId: string, cursor?: string) => {
      const isInitialLoad = !cursor;

      if (isInitialLoad) {
        setIsLoadingMessages(true);
      } else {
        setIsLoadingMore(true);
      }

      try {
        const result = await getMessages({ conversationId, cursor });

        if ("data" in result) {
          const data = result.data;
          if (isInitialLoad) {
            setMessages(data.messages);
          } else {
            setMessages((prev) => [...prev, ...data.messages]);
          }
          setNextCursor(data.nextCursor);
          setHasMore(data.hasMore);
        }
      } finally {
        if (isInitialLoad) {
          setIsLoadingMessages(false);
        } else {
          setIsLoadingMore(false);
        }
      }
    },
    []
  );

  // ========================================================================
  // Event Handlers
  // ========================================================================

  // Handle conversation selection
  const handleSelectConversation = useCallback(
    async (conversation: Conversation) => {
      setActiveConversation(conversation);
      setMessages([]);
      setNextCursor(null);
      setHasMore(false);

      // Load messages
      await loadMessages(conversation.id);

      // Mark messages as read
      startTransition(async () => {
        await markMessagesAsRead({ conversationId: conversation.id });
        // Clear unread count for this conversation
        setUnreadCounts((prev) => {
          const conversationUnread = prev.byConversation[conversation.id] || 0;
          return {
            total: Math.max(0, prev.total - conversationUnread),
            byConversation: {
              ...prev.byConversation,
              [conversation.id]: 0,
            },
          };
        });
      });
    },
    [loadMessages]
  );

  // Handle load more
  const handleLoadMore = useCallback(() => {
    if (activeConversation && nextCursor && !isLoadingMore) {
      loadMessages(activeConversation.id, nextCursor);
    }
  }, [activeConversation, nextCursor, isLoadingMore, loadMessages]);

  // Handle send message
  const handleSendMessage = useCallback(
    async (content: string): Promise<{ error?: string } | void> => {
      if (!activeConversation) return { error: "No conversation selected" };

      const result = await sendMessage({
        conversationId: activeConversation.id,
        content,
      });

      if ("data" in result) {
        // Add message to list (optimistic update)
        setMessages((prev) => [result.data, ...prev]);
      } else {
        return { error: result.error };
      }
    },
    [activeConversation]
  );

  // Handle back button for mobile
  const handleBack = useCallback(() => {
    setActiveConversation(null);
    setMessages([]);
  }, []);

  // Handle new chat creation/selection
  const handleNewChatSelect = useCallback(
    async (conversationId: string, clientName: string) => {
      // Check if this conversation is already in our list
      const existingConversation = conversations.find((c) => c.id === conversationId);

      if (existingConversation) {
        // Select the existing conversation
        await handleSelectConversation(existingConversation);
      } else {
        // Fetch the new conversation and add it to the list
        const result = await getConversationById(conversationId);
        if ("data" in result) {
          const newConversation = result.data as Conversation;
          // Add to conversations list at the top
          setConversations((prev) => [newConversation, ...prev]);
          // Select the new conversation
          await handleSelectConversation(newConversation);
        }
      }
    },
    [conversations, handleSelectConversation]
  );

  // ========================================================================
  // Search Handlers
  // ========================================================================

  // Handle search query change
  const handleSearchQueryChange = useCallback((query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setIsSearchMode(false);
      setSearchResults([]);
    }
  }, []);

  // Handle search execution with filters
  const executeSearch = useCallback(async (query: string, filters: SearchFiltersState) => {
    if (!query.trim()) {
      setIsSearchMode(false);
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setIsSearchMode(true);

    try {
      const result = await searchMessagesFullText({
        query,
        fromDate: filters.fromDate || undefined,
        toDate: filters.toDate || undefined,
        senderId: filters.senderId || undefined,
      });

      if ("success" in result && result.success) {
        setSearchResults(result.data.results);
      } else if ("error" in result) {
        console.error("Search error:", result.error);
        setSearchResults([]);
      }
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Handle search execution (called from search input)
  const handleSearch = useCallback(async (query: string) => {
    await executeSearch(query, filtersRef.current);
  }, [executeSearch]);

  // Handle filter changes - re-run search if there's a query
  const handleFiltersChange = useCallback(
    (newFilters: SearchFiltersState) => {
      filtersRef.current = newFilters;
      if (searchQuery.trim()) {
        executeSearch(searchQuery, newFilters);
      }
    },
    [searchQuery, executeSearch]
  );

  // Handle search result selection - navigate to conversation and scroll to message
  const handleSelectSearchResult = useCallback(
    async (conversationId: string, _messageId: string) => {
      // Find the conversation
      const conversation = conversations.find((c) => c.id === conversationId);
      if (!conversation) return;

      // Exit search mode
      setIsSearchMode(false);
      setSearchQuery("");
      setSearchResults([]);

      // Select the conversation
      await handleSelectConversation(conversation);

      // Note: _messageId can be used in a future enhancement to scroll to specific message
    },
    [conversations, handleSelectConversation]
  );

  const hasConversations = conversations.length > 0;

  return (
    <div className="space-y-6">
      {/* Header with search */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <PageGreetingHeader page="inbox" variant="dashboard" />
        <div className="flex flex-col gap-2 items-end">
          <div className="flex gap-2 items-center">
            <NewChatModal
              onConversationSelect={handleNewChatSelect}
              variant="dashboard"
            />
            <MessageSearchInput
              value={searchQuery}
              onChange={handleSearchQueryChange}
              onSearch={handleSearch}
              isSearching={isSearching}
              placeholder="Search messages..."
              className="md:w-72"
            />
          </div>
          {/* Search Filters - Only visible when search is active or has filters */}
          <SearchFilters
            participants={participants}
            onFiltersChange={handleFiltersChange}
          />
        </div>
      </div>

      {/* Main content - Two column layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-220px)] min-h-[500px]">
        {/* Conversation List / Search Results - Hidden on mobile when viewing thread */}
        <Card
          className={`md:col-span-1 flex flex-col overflow-hidden ${activeConversation && !isSearchMode ? "hidden md:flex" : "flex"}`}
        >
          <CardContent className="flex-1 overflow-y-auto p-0">
            {isSearchMode ? (
              <MessageSearchResults
                results={searchResults}
                query={searchQuery}
                onSelectResult={handleSelectSearchResult}
              />
            ) : (
              <ConversationList
                conversations={conversations}
                unreadCounts={unreadCounts}
                activeConversationId={activeConversation?.id || null}
                onSelect={handleSelectConversation}
              />
            )}
          </CardContent>
        </Card>

        {/* Thread View - Full width on mobile when viewing thread */}
        <Card
          className={`md:col-span-2 flex flex-col overflow-hidden ${activeConversation && !isSearchMode ? "flex" : "hidden md:flex"}`}
        >
          {/* Mobile back button */}
          {activeConversation && !isSearchMode && (
            <div className="md:hidden border-b border-border px-4 py-2">
              <Button variant="ghost" size="sm" onClick={handleBack}>
                Back to conversations
              </Button>
            </div>
          )}

          <CardContent className="flex-1 overflow-hidden p-0">
            {activeConversation && !isSearchMode ? (
              <ThreadView
                conversation={activeConversation}
                messages={messages}
                isLoading={isLoadingMessages}
                isLoadingMore={isLoadingMore}
                hasMore={hasMore}
                currentUserId={currentUserId}
                onLoadMore={handleLoadMore}
                onSend={handleSendMessage}
              />
            ) : hasConversations ? (
              <ThreadPlaceholder />
            ) : (
              <EmptyState />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
