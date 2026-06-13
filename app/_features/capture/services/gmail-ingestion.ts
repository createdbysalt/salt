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

// ============================================================================
// Types
// ============================================================================

interface GmailIngestionResult {
  success: boolean;
  capturesCreated: number;
  contactsDiscovered: number;
  error?: string;
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
 * Check if a message is likely noise (newsletters, automated, etc.)
 */
function isLikelyNoise(message: GmailMessage): boolean {
  const labels = message.labelIds || [];

  // Spam, trash, promotions, social, forums are noise
  const noiseLabels = ["SPAM", "TRASH", "CATEGORY_PROMOTIONS", "CATEGORY_SOCIAL", "CATEGORY_FORUMS"];
  if (labels.some((l) => noiseLabels.includes(l))) {
    return true;
  }

  // Check for common automated sender patterns
  const from = getHeader(message, "From")?.toLowerCase() || "";
  const automatedPatterns = [
    "noreply@",
    "no-reply@",
    "donotreply@",
    "notifications@",
    "newsletter@",
    "marketing@",
    "support@",
    "billing@",
    "automated@",
    "mailer-daemon",
  ];
  if (automatedPatterns.some((p) => from.includes(p))) {
    return true;
  }

  // Check for unsubscribe header (common in newsletters)
  if (getHeader(message, "List-Unsubscribe")) {
    return true;
  }

  return false;
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
    const date = new Date(parseInt(message.internalDate, 10)).toISOString();

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

/**
 * Create capture events for a batch of Gmail messages.
 */
async function createCaptureEventsForMessages(
  workspaceId: string,
  connectionId: string,
  messages: GmailMessage[],
  isBootstrap: boolean = false
): Promise<number> {
  const admin = createAdminClient();
  let created = 0;

  for (const message of messages) {
    // Skip noise
    if (isLikelyNoise(message)) continue;

    const extractedData = messageToExtractedData(message, null);

    const { error } = await admin.from("capture_events").insert({
      workspace_id: workspaceId,
      source_type: "gmail" as CaptureSourceType,
      source_connection_id: connectionId,
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
    } else if (error.code !== "23505") {
      // Ignore duplicate key errors (already captured)
      console.error("[gmail-ingestion] Failed to create capture:", error);
    }
  }

  return created;
}

// ============================================================================
// People Creation (Bootstrap)
// ============================================================================

/**
 * Create Person records for high-signal contacts during bootstrap.
 */
async function createPeopleFromContacts(
  workspaceId: string,
  contacts: ContactSignalScore[]
): Promise<number> {
  const admin = createAdminClient();
  let created = 0;

  for (const contact of contacts) {
    // Check if person already exists with this email
    const { data: existing } = await admin
      .from("people")
      .select("id")
      .eq("studio_id", workspaceId) // Note: people table uses studio_id (legacy)
      .eq("email", contact.email)
      .maybeSingle();

    if (existing) continue;

    const { error } = await admin.from("people").insert({
      studio_id: workspaceId, // Note: people table uses studio_id (legacy)
      name: contact.name || contact.email.split("@")[0],
      email: contact.email,
      relationship_status: "prospect", // Default, can be updated later
      metadata: {
        source: "gmail_bootstrap",
        signal_score: contact.score,
        signals: contact.signals,
      },
    });

    if (!error) {
      created++;
    } else {
      console.error("[gmail-ingestion] Failed to create person:", error);
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
        { query: searchQuery, maxResults: maxMessages },
        connection.composioConnectionId,
        workspaceId, // Composio entity ID = workspace ID
        { skipAuthCheck: true, workspaceId } // Background operation - skip auth
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

    console.log(`[gmail-ingestion] Fetched ${messages?.length ?? 0} messages`);

    if (!messages || messages.length === 0) {
      console.log(`[gmail-ingestion] No messages found`);
      return {
        success: true,
        capturesCreated: 0,
        contactsDiscovered: 0,
      };
    }

    // Extract contacts
    const contacts = extractContactsFromMessages(messages, connection.email);

    // Create capture events
    const capturesCreated = await createCaptureEventsForMessages(
      workspaceId,
      connection.composioConnectionId,
      messages,
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
        studio_id: workspaceId,
        action: "created",
        title: "Gmail connected",
        detail: `Salt discovered ${contactsCreated} contacts and ${capturesCreated} messages to review.`,
      });
    }

    return {
      success: true,
      capturesCreated,
      contactsDiscovered: contactsCreated,
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

/**
 * Build default Gmail query based on context.
 */
function buildDefaultQuery(isBootstrap: boolean): string {
  if (isBootstrap) {
    // Bootstrap: last 90 days, skip obvious noise
    const lookbackDate = new Date();
    lookbackDate.setDate(lookbackDate.getDate() - BOOTSTRAP_LIMITS.LOOKBACK_DAYS);
    const dateStr = lookbackDate.toISOString().split("T")[0].replace(/-/g, "/");

    return `after:${dateStr} -category:promotions -category:social -category:forums -from:noreply -from:no-reply`;
  }

  // Incremental: last 24 hours
  return "newer_than:1d -category:promotions -category:social -category:forums";
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

  const result = await ingestGmailMessages(workspaceId, {
    isBootstrap: true,
    maxMessages: 500, // Larger batch for bootstrap
  });

  console.log(
    `[gmail-ingestion] Bootstrap complete: ${result.capturesCreated} captures, ${result.contactsDiscovered} contacts`
  );

  return result;
}
