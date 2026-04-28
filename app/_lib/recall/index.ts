/**
 * Recall.ai Integration
 *
 * API client for Recall.ai meeting bot and transcription service.
 * Handles creating bots that join meetings, record, and transcribe.
 *
 * Usage:
 *   import { createBot, getTranscript, isRecallConfigured } from '@/app/_lib/recall'
 *
 * Calendar Integration:
 *   import { createCalendar, listCalendarEvents } from '@/app/_lib/recall'
 *
 * Environment variables required:
 *   - RECALL_API_KEY: Your Recall.ai API key
 *   - RECALL_WEBHOOK_SECRET: (Optional) Webhook signing secret
 *   - GOOGLE_CALENDAR_CLIENT_ID: (Optional) For Google Calendar integration
 *   - GOOGLE_CALENDAR_CLIENT_SECRET: (Optional) For Google Calendar integration
 */

// Bot API client functions
export {
  createBot,
  getBot,
  listBots,
  deleteBot,
  sendChatMessage,
  getTranscript,
  transcriptToPlainText,
  getTranscriptSegments,
  isRecallConfigured,
  detectPlatform,
  generateBotName,
  RecallError,
} from "./client";

// Calendar V2 API client functions
export {
  createCalendar,
  getCalendar,
  listCalendars,
  deleteCalendar,
  updateCalendarWebhook,
  listCalendarEvents,
  getCalendarEvent,
  scheduleBotForEvent,
  getScheduledBot,
  deleteBotForEvent,
  getOAuthCredentials,
  isCalendarConfigured,
  isGoogleCalendarConfigured,
  isMicrosoftCalendarConfigured,
} from "./calendar";

// Bot API types
export type {
  BotStatus,
  MeetingPlatform,
  CreateBotInput,
  RecallBot,
  RecallSpeaker,
  RecallWord,
  RecallTranscriptSegment,
  RecallTranscript,
  WebhookEventType,
  RecallWebhookPayload,
  BotStatusChangeWebhook,
  BotDoneWebhook,
  BotMediaReadyWebhook,
  RecallErrorCode,
  PaginatedResponse,
} from "./types";

// Calendar V2 API types
export type {
  CalendarProvider,
  CalendarStatus,
  CreateCalendarInput,
  RecallCalendar,
  CalendarEventAttendee,
  RecallCalendarEvent,
  CalendarEventsResponse,
  CalendarBotConfig,
  CalendarScheduledBot,
  CalendarSyncWebhook,
  CalendarDisconnectedWebhook,
  RecallCalendarWebhook,
  ShouldRecordResult,
} from "./calendar-types";
