/**
 * Messaging Feature - Client Hooks
 *
 * React hooks for real-time messaging functionality.
 *
 * Usage:
 *   import { useRealtimeMessages, useUnreadCount } from '@/app/_features/messaging/hooks'
 */

"use client";

// Real-time subscriptions
export { useRealtimeMessages } from "@/libs/hooks/use-realtime-messages";
export { useRealtimeConversations } from "@/libs/hooks/use-realtime-conversations";

// Unread count management
export { useUnreadCount } from "@/libs/hooks/use-unread-count";

// Types
export type { ConversationUpdate } from "@/libs/hooks/use-realtime-conversations";
export type { UnreadCounts } from "@/libs/hooks/use-unread-count";
