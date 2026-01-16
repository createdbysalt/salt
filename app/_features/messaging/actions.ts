/**
 * Messaging Feature - Server Actions
 *
 * This module re-exports actions from the centralized messaging module.
 * Handles conversations, messages, unread counts, and search.
 *
 * Usage:
 *   import { sendMessage, getConversations } from '@/app/_features/messaging/actions'
 *   import type { Message, Conversation } from '@/app/_features/messaging/types'
 */

// Conversation actions
export {
  getOrCreateConversation,
  getConversations,
  getOrCreateClientConversation,
  getClientConversations,
  getConversationById,
} from "@/app/actions/messaging/conversation-actions";

// Message actions
export {
  sendMessage,
  getMessages,
  markMessagesAsRead,
  updateLastSeen,
} from "@/app/actions/messaging/message-actions";

// Unread count actions
export {
  getUnreadCounts,
  getConversationUnreadCount,
  getStudioUnreadCounts,
  getClientUnreadCounts,
  getClientUnreadInfo,
} from "@/app/actions/messaging/unread-actions";

// Search actions
export {
  searchMessages,
  searchStudioMessages,
  searchClientMessages,
} from "@/app/actions/messaging/search-actions";
