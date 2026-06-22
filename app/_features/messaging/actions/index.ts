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
  searchMessagesFullText,
  getMessageParticipants,
  type SearchResult,
  type SearchResponse,
  type FullTextSearchInput,
  type FullTextMessage,
  type FullTextSearchResult,
  type FullTextSearchResponse,
  type MessageParticipant,
} from "./search-actions";

export {
  sendClientEmail,
  getClientEmails,
  getClientEmailThreads,
  type SentEmail,
  type ClientEmail,
} from "./send-client-email";
