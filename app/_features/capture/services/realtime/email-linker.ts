import "server-only";

/**
 * Real-time Email Linker
 *
 * When a new email arrives via capture, this service:
 * 1. Resolves the sender to a Person (creates if meets criteria)
 * 2. Resolves the sender's org (creates if business domain)
 * 3. Links Person ↔ Org
 * 4. Attaches the email to the Person's profile
 * 5. Creates an Auto-handled finding for transparency
 *
 * This runs synchronously on email capture — no LLM, just fast linking.
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import type { ExtractedData } from "../../types";
import { extractCaptureEmailFields } from "../extract-capture-email";
import { resolvePerson } from "../system-plays/person-resolver";
import { resolveOrg, linkPersonToOrg } from "../system-plays/org-resolver";
import { executeSystemPlay } from "../system-plays/executor";

export interface EmailLinkInput {
  captureEventId: string;
  workspaceId: string;
  fromEmail: string;
  fromName: string | null;
  toEmails: string[];
  subject: string;
  threadId: string;
  isSentByUser: boolean;
  messageId: string;
}

export interface EmailLinkResult {
  success: boolean;
  personId?: string;
  orgId?: string;
  personCreated: boolean;
  orgCreated: boolean;
  linked: boolean;
  autoHandledFindingId?: string;
  error?: string;
}

/**
 * Process a captured email in real-time.
 * Fast path — no LLM, just entity resolution and linking.
 */
export async function linkEmailToPerson(
  input: EmailLinkInput
): Promise<EmailLinkResult> {
  const {
    captureEventId,
    workspaceId,
    fromEmail,
    fromName,
    threadId,
    isSentByUser,
  } = input;

  const admin = createAdminClient();

  try {
    // 1. Resolve Person
    const personResult = await resolvePerson(workspaceId, {
      email: fromEmail,
      name: fromName ?? undefined,
      signals: {
        you_initiated: isSentByUser,
        is_bidirectional_thread: false, // Would need thread lookup
      },
    });

    // If person wasn't resolved (low confidence, noise email), skip linking
    if (!personResult.resolved && !personResult.needs_confirmation) {
      return {
        success: true,
        personCreated: false,
        orgCreated: false,
        linked: false,
      };
    }

    // 2. Resolve Org (if business domain)
    let orgId: string | undefined;
    let orgCreated = false;
    if (personResult.person_id) {
      const orgResult = await resolveOrg(workspaceId, fromEmail);
      orgId = orgResult.org_id;
      orgCreated = orgResult.is_new;

      // 3. Link Person ↔ Org
      if (orgId) {
        await linkPersonToOrg(workspaceId, personResult.person_id, orgId);
      }
    }

    // 4. Attach email to Person via system play
    if (personResult.person_id) {
      await executeSystemPlay(workspaceId, "system:attach-email", {
        email_id: captureEventId,
        target_type: "person",
        target_id: personResult.person_id,
      });
    }

    // 5. Create Auto-handled finding for transparency
    let autoHandledFindingId: string | undefined;
    if (personResult.is_new && personResult.person_id) {
      const { data: finding } = await admin
        .from("intelligence_findings")
        .insert({
          workspace_id: workspaceId,
          person_id: personResult.person_id,
          org_id: orgId ?? null,
          finding_type: "new_person",
          title: `Added ${personResult.person_name || fromEmail}`,
          content: personResult.confidence_reason,
          confidence: personResult.confidence,
          state: personResult.confidence >= 85 ? "auto_handled" : "needs_you",
          evidence: {
            source_type: "email",
            source_id: captureEventId,
          },
        })
        .select("id")
        .single();

      autoHandledFindingId = finding?.id;
    }

    // 6. Mark capture event as processed
    await admin
      .from("capture_events")
      .update({
        processed_at: new Date().toISOString(),
        resolved_person_id: personResult.person_id,
        resolved_org_id: orgId,
      })
      .eq("id", captureEventId);

    return {
      success: true,
      personId: personResult.person_id,
      orgId,
      personCreated: personResult.is_new,
      orgCreated,
      linked: !!(personResult.person_id && orgId),
      autoHandledFindingId,
    };
  } catch (error) {
    console.error("Email linking failed:", error);
    return {
      success: false,
      personCreated: false,
      orgCreated: false,
      linked: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Extract email metadata from a Gmail API message payload.
 */
export function extractEmailLinkInput(
  captureEventId: string,
  workspaceId: string,
  payload: Record<string, unknown>,
  extractedData?: ExtractedData | null
): EmailLinkInput | null {
  const fields = extractCaptureEmailFields(payload, extractedData);
  if (!fields) return null;

  return {
    captureEventId,
    workspaceId,
    fromEmail: fields.from_email,
    fromName: fields.from_name,
    toEmails: fields.to_emails,
    subject: fields.subject,
    threadId: fields.thread_id,
    isSentByUser: fields.is_sent_by_user,
    messageId: (payload.id as string) || captureEventId,
  };
}
