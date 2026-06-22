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
} from "@/app/_features/messaging/actions";

export type {
  Message,
  MessagesResponse,
  SenderType,
} from "@/app/_features/messaging/actions";

export type {
  UnreadCounts,
} from "@/app/_features/messaging/actions";

export type {
  SearchResult,
  SearchResponse,
  FullTextSearchResult,
  FullTextSearchResponse,
  FullTextMessage,
  MessageParticipant,
} from "@/app/_features/messaging/actions";
