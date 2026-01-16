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
export { useRealtimeMessages } from "@/app/_lib/hooks/use-realtime-messages";
export { useRealtimeConversations } from "@/app/_lib/hooks/use-realtime-conversations";

// Unread count management
export { useUnreadCount } from "@/app/_lib/hooks/use-unread-count";

// Types
export type { ConversationUpdate } from "@/app/_lib/hooks/use-realtime-conversations";
export type { UnreadCounts } from "@/app/_lib/hooks/use-unread-count";
