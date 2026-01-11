// Messaging Actions
// Export all messaging-related server actions

export {
  getOrCreateConversation,
  getConversations,
  getOrCreateClientConversation,
  getClientConversations,
  getConversationById,
  type Conversation,
  type ClientConversation,
} from "./conversation-actions";

export {
  sendMessage,
  getMessages,
  markMessagesAsRead,
  updateLastSeen,
  type Message,
  type MessagesResponse,
  type SenderType,
} from "./message-actions";

export {
  getUnreadCounts,
  getConversationUnreadCount,
  getStudioUnreadCounts,
  getClientUnreadCounts,
  getClientUnreadInfo,
  type UnreadCounts,
} from "./unread-actions";

export {
  searchMessages,
  searchStudioMessages,
  searchClientMessages,
  type SearchResult,
  type SearchResponse,
} from "./search-actions";
