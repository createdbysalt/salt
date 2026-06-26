import "server-only";

/**
 * Gmail Ingestion Service
 *
 * Fetches Gmail messages via Composio and creates capture events.
 * Handles both incremental sync and first-run bootstrap.
 *
 * Design decisions (from 2026-06-12 founder interview):
 * - Bootstrap extracts top 10-15 high-signal contacts, not everyone
 * - Each message becomes a capture event
 * - Contacts are scored by recency × frequency
 * - Auto-routes high-confidence matches; low-confidence goes to Pending
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { getConnectionStatus } from "@/app/_lib/composio/connections";
import { listGmailMessages, getGmailMessage } from "@/app/_lib/composio/actions";
import { normalizeComposioGmailMessages } from "@/app/_lib/composio/gmail-messages";
import type { GmailMessage } from "@/app/_lib/composio/types";
import type {
  CaptureSourceType,
  CaptureEventType,
  CaptureOrigin,
  CaptureState,
  MessageExtractedData,
  ContactExtractedData,
} from "../types";
import { BOOTSTRAP_LIMITS } from "../types";
import {
  scoreContactSignal,
  filterHighSignalContacts,
  type ContactSignalScore,
} from "./confidence";
import {
  resolvePerson,
  resolveOrg,
  linkPersonToOrg,
} from "./system-plays";
import { isGmailMessageNoise } from "./intelligence/capture-noise";

// ============================================================================
// Types
// ============================================================================

interface GmailIngestionResult {
  success: boolean;
  capturesCreated: number;
  contactsDiscovered: number;
  error?: string;
  debug?: {
    messagesReceived: number;
    skippedNoise: number;
    duplicates: number;
    insertErrors: number;
    firstError?: string;
    integrationId: string | null;
  };
}

interface ExtractedContact {
  email: string;
  name?: string;
  messageCount: number;
  lastContactDate: string;
  isInbound: boolean;
}

interface ParsedEmailAddress {
  email: string;
  name?: string;
}

// ============================================================================
// Email Parsing
// ============================================================================

/**
 * Parse email address from header format: "Name <email@example.com>" or "email@example.com"
 */
function parseEmailAddress(raw: string): ParsedEmailAddress | null {
  if (!raw) return null;

  const match = raw.match(/^(?:"?([^"<]+)"?\s*)?<?([^<>@\s]+@[^<>@\s]+)>?$/);
  if (!match) return null;

  return {
    name: match[1]?.trim() || undefined,
    email: match[2].toLowerCase(),
  };
}

/**
 * Parse multiple email addresses from a comma-separated header.
 */
function parseEmailAddresses(raw: string): ParsedEmailAddress[] {
  if (!raw) return [];

  return raw
    .split(",")
    .map((addr) => parseEmailAddress(addr.trim()))
    .filter((addr): addr is ParsedEmailAddress => addr !== null);
}

/**
 * Get header value from Gmail message payload.
 */
function getHeader(message: GmailMessage, name: string): string | undefined {
  return message.payload.headers.find(
    (h) => h.name.toLowerCase() === name.toLowerCase()
  )?.value;
}

/**
 * Check if an email address is likely the user's own address.
 * Uses heuristics: from address matches connected email, or is in "me" label.
 */
function isOwnEmail(email: string, userEmail: string | null): boolean {
  if (!userEmail) return false;
  return email.toLowerCase() === userEmail.toLowerCase();
}

/**
 * Safely parse a message date from various formats.
 * Gmail API returns internalDate as milliseconds string, but Composio may vary.
 */
function parseMessageDate(message: GmailMessage): string {
  // Try internalDate first (Gmail's milliseconds timestamp)
  if (message.internalDate) {
    const ts = typeof message.internalDate === "number"
      ? message.internalDate
      : parseInt(message.internalDate, 10);
    if (!isNaN(ts) && ts > 0) {
      const date = new Date(ts);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    }
    // Maybe it's already an ISO string
    if (typeof message.internalDate === "string" && message.internalDate.includes("-")) {
      const date = new Date(message.internalDate);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    }
  }

  // Fallback: try Date header
  const dateHeader = getHeader(message, "Date");
  if (dateHeader) {
    const date = new Date(dateHeader);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  // Last resort: now
  return new Date().toISOString();
}

/**
 * Check if a message is likely noise (newsletters, automated, etc.)
 */
function isLikelyNoise(message: GmailMessage): boolean {
  return isGmailMessageNoise(message);
}

// ============================================================================
// Contact Extraction
// ============================================================================

/**
 * Extract contacts from a batch of Gmail messages.
 */
function extractContactsFromMessages(
  messages: GmailMessage[],
  userEmail: string | null
): Map<string, ExtractedContact> {
  const contacts = new Map<string, ExtractedContact>();

  for (const message of messages) {
    if (isLikelyNoise(message)) continue;

    const from = parseEmailAddress(getHeader(message, "From") || "");
    const to = parseEmailAddresses(getHeader(message, "To") || "");
    const cc = parseEmailAddresses(getHeader(message, "Cc") || "");
    const date = parseMessageDate(message);

    // Process sender
    if (from && !isOwnEmail(from.email, userEmail)) {
      const existing = contacts.get(from.email);
      if (existing) {
        existing.messageCount++;
        if (date > existing.lastContactDate) {
          existing.lastContactDate = date;
        }
        existing.isInbound = true;
      } else {
        contacts.set(from.email, {
          email: from.email,
          name: from.name,
          messageCount: 1,
          lastContactDate: date,
          isInbound: true,
        });
      }
    }

    // Process recipients (when user sent the email)
    if (from && isOwnEmail(from.email, userEmail)) {
      for (const recipient of [...to, ...cc]) {
        if (isOwnEmail(recipient.email, userEmail)) continue;

        const existing = contacts.get(recipient.email);
        if (existing) {
          existing.messageCount++;
          if (date > existing.lastContactDate) {
            existing.lastContactDate = date;
          }
        } else {
          contacts.set(recipient.email, {
            email: recipient.email,
            name: recipient.name,
            messageCount: 1,
            lastContactDate: date,
            isInbound: false,
          });
        }
      }
    }
  }

  return contacts;
}

/**
 * Score and filter contacts to find high-signal ones for bootstrap.
 */
function findHighSignalContacts(
  contacts: Map<string, ExtractedContact>,
  limit: number
): ContactSignalScore[] {
  const now = Date.now();
  const scores: ContactSignalScore[] = [];

  for (const [email, contact] of contacts) {
    const recencyDays = Math.floor(
      (now - new Date(contact.lastContactDate).getTime()) / (1000 * 60 * 60 * 24)
    );

    const score = scoreContactSignal(
      recencyDays,
      contact.messageCount,
      0, // Revenue not known yet
      contact.isInbound ? contact.messageCount : 0 // Thread count approximation
    );

    scores.push({
      email,
      name: contact.name,
      score,
      signals: {
        recency: recencyDays,
        frequency: contact.messageCount,
      },
    });
  }

  return filterHighSignalContacts(scores, limit);
}

// ============================================================================
// Capture Event Creation
// ============================================================================

/**
 * Convert Gmail message to extracted data format.
 */
function messageToExtractedData(
  message: GmailMessage,
  userEmail: string | null
): MessageExtractedData {
  const from = parseEmailAddress(getHeader(message, "From") || "");
  const to = parseEmailAddresses(getHeader(message, "To") || "");
  const cc = parseEmailAddresses(getHeader(message, "Cc") || "");

  return {
    type: "message",
    subject: getHeader(message, "Subject"),
    body_preview: message.snippet,
    sender: from
      ? { name: from.name, email: from.email }
      : undefined,
    recipients: [
      ...to.map((r) => ({ ...r, type: "to" as const })),
      ...cc.map((r) => ({ ...r, type: "cc" as const })),
    ],
    thread_id: message.threadId,
    is_unread: message.labelIds?.includes("UNREAD"),
    labels: message.labelIds,
  };
}

interface CaptureCreationResult {
  created: number;
  skippedNoise: number;
  duplicates: number;
  errors: number;
  firstError?: string;
}

/**
 * Create capture events for a batch of Gmail messages.
 */
async function createCaptureEventsForMessages(
  workspaceId: string,
  integrationId: string | null, // workspace_integrations.id (UUID)
  messages: GmailMessage[],
  isBootstrap: boolean = false
): Promise<CaptureCreationResult> {
  const admin = createAdminClient();
  let created = 0;
  let skippedNoise = 0;
  let duplicates = 0;
  let errors = 0;
  let firstError: string | undefined;

  console.log(`[gmail-ingestion] Creating captures for ${messages.length} messages`);

  for (const message of messages) {
    // Skip noise
    if (isLikelyNoise(message)) {
      skippedNoise++;
      continue;
    }

    const extractedData = messageToExtractedData(message, null);

    const { error } = await admin.from("capture_events").insert({
      workspace_id: workspaceId,
      source_type: "gmail" as CaptureSourceType,
      source_connection_id: integrationId,
      source_external_id: message.id,
      capture_type: "message" as CaptureEventType,
      origin: "found" as CaptureOrigin,
      title: extractedData.subject || message.snippet?.slice(0, 100),
      raw_payload: message,
      extracted_data: extractedData,
      state: "pending" as CaptureState,
      overall_confidence: null, // Will be calculated by routing engine
      is_bootstrap: isBootstrap,
    });

    if (!error) {
      created++;
    } else if (error.code === "23505") {
      duplicates++;
    } else {
      errors++;
      if (!firstError) {
        firstError = `${error.code}: ${error.message}`;
      }
      console.error("[gmail-ingestion] Failed to create capture:", error.message, error.code);
    }
  }

  console.log(`[gmail-ingestion] Capture creation summary: created=${created}, skippedNoise=${skippedNoise}, duplicates=${duplicates}, errors=${errors}`);
  return { created, skippedNoise, duplicates, errors, firstError };
}

// ============================================================================
// People Creation (Bootstrap) — Using System Plays
// ============================================================================

/**
 * Create Person and Org records for high-signal contacts during bootstrap.
 * Uses the system plays infrastructure with intentional creation criteria.
 *
 * Creation criteria (from 2026-06-13 interview):
 * - Bidirectional threads (you replied)
 * - You initiated the thread
 * - High email frequency (3+ emails)
 * - Email signature present
 *
 * NOT arbitrary "top 15 by recency × frequency" — signals must justify creation.
 */
async function createPeopleFromContacts(
  workspaceId: string,
  contacts: ContactSignalScore[]
): Promise<number> {
  let created = 0;

  for (const contact of contacts) {
    // Build signals from contact data
    const signals = {
      is_bidirectional_thread: contact.signals.frequency > 1, // Multiple messages = likely bidirectional
      email_count: contact.signals.frequency,
      // Note: Other signals (Stripe, QuickBooks, Calendar) would be added
      // from those connectors when available
    };

    // Use the new person resolver with proper criteria
    const personResult = await resolvePerson(workspaceId, {
      email: contact.email,
      name: contact.name,
      signals,
    });

    if (personResult.resolved && personResult.is_new && personResult.person_id) {
      created++;

      // Also resolve Org and link if applicable
      const orgResult = await resolveOrg(workspaceId, contact.email);
      if (orgResult.resolved && orgResult.org_id) {
        await linkPersonToOrg(workspaceId, personResult.person_id, orgResult.org_id);
      }
    }
  }

  return created;
}

// ============================================================================
// Main Ingestion Functions
// ============================================================================

/**
 * Run Gmail ingestion for a workspace.
 *
 * @param workspaceId - The workspace to ingest for
 * @param options.isBootstrap - If true, runs first-scan bootstrap logic
 * @param options.maxMessages - Maximum messages to fetch (default 100)
 * @param options.query - Gmail search query (default: recent messages)
 */
export async function ingestGmailMessages(
  workspaceId: string,
  options: {
    isBootstrap?: boolean;
    maxMessages?: number;
    query?: string;
  } = {}
): Promise<GmailIngestionResult> {
  const { isBootstrap = false, maxMessages = 100, query } = options;

  // Get Gmail connection
  const connection = await getConnectionStatus("gmail", workspaceId);
  console.log(`[gmail-ingestion] Connection status:`, {
    connected: connection.connected,
    hasConnectionId: !!connection.composioConnectionId,
    email: connection.email,
  });

  if (!connection.connected || !connection.composioConnectionId) {
    console.error(`[gmail-ingestion] Gmail not connected for workspace ${workspaceId}`);
    return {
      success: false,
      capturesCreated: 0,
      contactsDiscovered: 0,
      error: "Gmail not connected",
    };
  }

  try {
    // Fetch messages
    const searchQuery = query || buildDefaultQuery(isBootstrap);
    console.log(`[gmail-ingestion] Fetching messages with query: ${searchQuery}, max: ${maxMessages}`);
    console.log(`[gmail-ingestion] Using connectionId: ${connection.composioConnectionId}`);

    let messages: GmailMessage[];
    try {
      messages = await listGmailMessages(
        { query: searchQuery, maxResults: maxMessages, includePayload: false, verbose: false },
        connection.composioConnectionId,
        workspaceId, // Composio entity ID = workspace ID
        { skipAuthCheck: true, workspaceId, unattended: true } // Background operation - skip auth
      );
    } catch (composioError) {
      console.error(`[gmail-ingestion] Composio API error:`, composioError);
      return {
        success: false,
        capturesCreated: 0,
        contactsDiscovered: 0,
        error: composioError instanceof Error ? composioError.message : "Composio API failed",
      };
    }

    // Debug: log raw response structure
    console.log(`[gmail-ingestion] Raw response type: ${typeof messages}, isArray: ${Array.isArray(messages)}`);
    if (messages && typeof messages === "object" && !Array.isArray(messages)) {
      console.log(`[gmail-ingestion] Response keys:`, Object.keys(messages));
    }

    // Handle different response formats from Composio
    let messageList: GmailMessage[] = [];
    if (Array.isArray(messages)) {
      messageList = normalizeComposioGmailMessages(messages);
    } else if (messages && typeof messages === "object") {
      // Composio may wrap in { messages: [...] } or { data: [...] } or { emails: [...] }
      const wrapped = messages as Record<string, unknown>;
      if (Array.isArray(wrapped.messages)) {
        messageList = normalizeComposioGmailMessages(wrapped.messages);
      } else if (Array.isArray(wrapped.data)) {
        messageList = normalizeComposioGmailMessages(wrapped.data);
      } else if (Array.isArray(wrapped.emails)) {
        messageList = normalizeComposioGmailMessages(wrapped.emails);
      } else if (Array.isArray(wrapped.results)) {
        messageList = normalizeComposioGmailMessages(wrapped.results);
      }
    }

    console.log(`[gmail-ingestion] Fetched ${messageList.length} messages`);

    if (messageList.length === 0) {
      console.log(`[gmail-ingestion] No messages found`);
      return {
        success: true,
        capturesCreated: 0,
        contactsDiscovered: 0,
      };
    }

    // Extract contacts
    const contacts = extractContactsFromMessages(messageList, connection.email);

    // Create capture events
    const captureResult = await createCaptureEventsForMessages(
      workspaceId,
      connection.integrationId, // Use workspace_integrations.id (UUID), not Composio connection ID
      messageList,
      isBootstrap
    );

    let contactsCreated = 0;

    // Bootstrap: create People records for high-signal contacts
    if (isBootstrap) {
      const highSignalContacts = findHighSignalContacts(
        contacts,
        BOOTSTRAP_LIMITS.MAX_PEOPLE
      );
      contactsCreated = await createPeopleFromContacts(workspaceId, highSignalContacts);

      // Log bootstrap completion
      const admin = createAdminClient();
      await admin.from("activity_entries").insert({
        workspace_id: workspaceId,
        action: "created",
        title: "Gmail connected",
        detail: `Salt discovered ${contactsCreated} contacts and ${captureResult.created} messages to review.`,
      });
    }

    return {
      success: true,
      capturesCreated: captureResult.created,
      contactsDiscovered: contactsCreated,
      debug: {
        messagesReceived: messageList.length,
        skippedNoise: captureResult.skippedNoise,
        duplicates: captureResult.duplicates,
        insertErrors: captureResult.errors,
        firstError: captureResult.firstError,
        integrationId: connection.integrationId,
      },
    };
  } catch (error) {
    console.error("[gmail-ingestion] Ingestion failed:", error);
    return {
      success: false,
      capturesCreated: 0,
      contactsDiscovered: 0,
      error: error instanceof Error ? error.message : "Ingestion failed",
    };
  }
}

function formatGmailAfterDate(lookbackDays: number): string {
  const lookbackDate = new Date();
  lookbackDate.setDate(lookbackDate.getDate() - lookbackDays);
  return lookbackDate.toISOString().split("T")[0].replace(/-/g, "/");
}

/**
 * Build default Gmail query based on context.
 */
function buildDefaultQuery(isBootstrap: boolean): string {
  if (isBootstrap) {
    // Bootstrap still starts with sent mail (highest signal for People discovery).
    return `in:sent after:${formatGmailAfterDate(BOOTSTRAP_LIMITS.LOOKBACK_DAYS)}`;
  }

  // Incremental: recent primary inbox messages
  return "newer_than:7d category:primary -from:noreply -from:no-reply -from:notifications";
}

function mergeIngestionResults(
  results: GmailIngestionResult[]
): GmailIngestionResult {
  const successes = results.filter((r) => r.success);
  const failures = results.filter((r) => !r.success);

  if (successes.length === 0) {
    return (
      failures[0] ?? {
        success: false,
        capturesCreated: 0,
        contactsDiscovered: 0,
        error: "Gmail sync failed",
      }
    );
  }

  const merged = successes.reduce(
    (acc, result) => ({
      success: true,
      capturesCreated: acc.capturesCreated + result.capturesCreated,
      contactsDiscovered: acc.contactsDiscovered + result.contactsDiscovered,
      debug: {
        messagesReceived:
          (acc.debug?.messagesReceived ?? 0) + (result.debug?.messagesReceived ?? 0),
        skippedNoise:
          (acc.debug?.skippedNoise ?? 0) + (result.debug?.skippedNoise ?? 0),
        duplicates: (acc.debug?.duplicates ?? 0) + (result.debug?.duplicates ?? 0),
        insertErrors:
          (acc.debug?.insertErrors ?? 0) + (result.debug?.insertErrors ?? 0),
        firstError: acc.debug?.firstError ?? result.debug?.firstError,
        integrationId: acc.debug?.integrationId ?? result.debug?.integrationId ?? null,
      },
    }),
    {
      success: true,
      capturesCreated: 0,
      contactsDiscovered: 0,
      debug: {
        messagesReceived: 0,
        skippedNoise: 0,
        duplicates: 0,
        insertErrors: 0,
        integrationId: null,
      },
    } satisfies GmailIngestionResult
  );

  if (failures.length > 0) {
    const warning = failures
      .map((f) => f.error)
      .filter((msg): msg is string => Boolean(msg))
      .join("; ");
    if (warning) {
      merged.error = warning;
    }
  }

  return merged;
}

export interface GmailSyncOptions {
  /** Days to look back (default: 90 for bootstrap-style sync, 7 for intelligence). */
  lookbackDays?: number;
  /** Max messages per Gmail query (Composio cap: 100). */
  maxMessagesPerQuery?: number;
  /** Include sent mail (default true). */
  includeSent?: boolean;
  /** Include inbox mail (default true). */
  includeInbox?: boolean;
  /** Run bootstrap People discovery on high-signal contacts. */
  isBootstrap?: boolean;
}

/**
 * Sync Gmail into capture_events using sent + inbox queries.
 * Dedupes on workspace_id + source_type + source_external_id.
 */
export async function syncGmailCaptures(
  workspaceId: string,
  options: GmailSyncOptions = {}
): Promise<GmailIngestionResult> {
  const {
    lookbackDays = 7,
    maxMessagesPerQuery = 100,
    includeSent = true,
    includeInbox = true,
    isBootstrap = false,
  } = options;

  const afterDate = formatGmailAfterDate(lookbackDays);
  const queries: string[] = [];

  if (includeSent) {
    queries.push(`in:sent after:${afterDate}`);
  }
  if (includeInbox) {
    // Avoid category:primary — it often returns 0 rows via Composio/Gmail API.
    queries.push(
      `in:inbox after:${afterDate} -category:promotions -category:social -from:noreply -from:no-reply`
    );
  }

  if (queries.length === 0) {
    return {
      success: false,
      capturesCreated: 0,
      contactsDiscovered: 0,
      error: "No Gmail sync queries configured",
    };
  }

  console.log(
    `[gmail-ingestion] Syncing ${queries.length} query/queries for workspace ${workspaceId} (${lookbackDays}d)`
  );

  const results: GmailIngestionResult[] = [];
  for (const [index, query] of queries.entries()) {
    results.push(
      await ingestGmailMessages(workspaceId, {
        isBootstrap: isBootstrap && index === 0,
        maxMessages: maxMessagesPerQuery,
        query,
      })
    );
  }

  return mergeIngestionResults(results);
}

/**
 * Check if bootstrap has already run for a workspace.
 */
export async function hasBootstrapRun(workspaceId: string): Promise<boolean> {
  const admin = createAdminClient();

  const { count } = await admin
    .from("capture_events")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("source_type", "gmail")
    .eq("is_bootstrap", true);

  return (count ?? 0) > 0;
}

/**
 * Run Gmail bootstrap scan for a workspace (first-time connection).
 * Only runs if bootstrap hasn't already completed.
 */
export async function runGmailBootstrap(
  workspaceId: string
): Promise<GmailIngestionResult> {
  // Note: We don't check hasBootstrapRun anymore because:
  // 1. Capture inserts are deduplicated by source_external_id (Gmail message ID)
  // 2. People inserts check for existing email before creating
  // This allows re-bootstrap after disconnect/reconnect without duplicates.

  console.log(`[gmail-ingestion] Running bootstrap for workspace ${workspaceId}`);

  const result = await syncGmailCaptures(workspaceId, {
    lookbackDays: BOOTSTRAP_LIMITS.LOOKBACK_DAYS,
    maxMessagesPerQuery: 100,
    includeSent: true,
    includeInbox: true,
    isBootstrap: true,
  });

  console.log(
    `[gmail-ingestion] Bootstrap complete: ${result.capturesCreated} captures, ${result.contactsDiscovered} contacts`
  );

  return result;
}
