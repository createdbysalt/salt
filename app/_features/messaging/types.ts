/**
 * Messaging Feature - Types
 *
 * Re-exports types from the messaging module.
 *
 * Usage:
 *   import type { Message, Conversation } from '@/app/_features/messaging/types'
 */

export type {
  Conversation,
  ClientConversation,
} from "@/app/actions/messaging/conversation-actions";

export type {
  Message,
  MessagesResponse,
  SenderType,
} from "@/app/actions/messaging/message-actions";

export type {
  UnreadCounts,
} from "@/app/actions/messaging/unread-actions";

export type {
  SearchResult,
  SearchResponse,
  FullTextSearchResult,
  FullTextSearchResponse,
  FullTextMessage,
  MessageParticipant,
} from "@/app/actions/messaging/search-actions";
