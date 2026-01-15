"use server";

/**
 * Messaging Feature - Server Actions
 *
 * This module re-exports actions from the centralized messaging module.
 * Handles conversations, messages, unread counts, and search.
 *
 * Usage:
 *   import { sendMessage, getConversations } from '@/app/_features/messaging/actions'
 */

// Re-export everything from the messaging index
export * from "@/app/actions/messaging";
