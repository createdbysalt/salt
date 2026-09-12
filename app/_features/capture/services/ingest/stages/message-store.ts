import "server-only";

import type { createAdminClient } from "@/app/_lib/supabase/admin";
import { findPersonIdsByEmail } from "@/app/_features/memory/records/person-emails";
import type { CaptureEnvelope } from "../../../adapters/types";

type AdminClient = ReturnType<typeof createAdminClient>;

/**
 * Message-store stage (Memory Sourcing Overhaul, Phase 2).
 *
 * Persists admitted message captures (email, Slack DMs) as threaded rows in
 * conversation_threads / conversation_messages — the learn-layer message
 * store that memory extraction, the capture-intelligence scan, and the
 * Convos surface all read from.
 *
 * Body policy: the transient `envelope.bodyText` (full body when the payload
 * carried it at no extra cost, e.g. Gmail backfill pages) wins; otherwise
 * the snippet is stored so threads are still readable. Bodies are capped
 * plain text with a 90-day TTL — extraction fuel, not an archive. Held and
 * noise captures never reach this stage (the orchestrator gates it), so the
 * thin-storage privacy stance for kept-out mail is unchanged.
 */

/** ~10k chars — enough for extraction, bounded for storage. */
export const MESSAGE_BODY_CAP = 10_000;
/** Bodies are extraction fuel; thread metadata persists after purge. */
export const MESSAGE_BODY_TTL_DAYS = 90;

const EMAIL_SOURCES = new Set(["gmail", "outlook", "yahoo_mail"]);

function channelForSource(sourceType: string): string {
  if (EMAIL_SOURCES.has(sourceType)) return "email";
  if (sourceType === "slack") return "slack";
  return sourceType;
}

interface Counterparty {
  email: string | null;
  name: string | null;
}

/**
 * The other side of the conversation: sender for inbound mail, first
 * recipient for outbound. Falls back to any non-self participant.
 */
function resolveCounterparty(
  envelope: CaptureEnvelope,
  userEmail: string | null,
): Counterparty {
  const extracted = envelope.extracted as Record<string, unknown>;
  const self = userEmail?.toLowerCase() ?? null;
  const isOutbound = extracted.isSentByUser === true;

  const notSelf = (email: string | null | undefined) =>
    Boolean(email) && email!.toLowerCase() !== self;

  if (isOutbound) {
    const to = envelope.participants.find(
      (p) => (p.role === "to" || p.role === "cc") && notSelf(p.email),
    );
    if (to) return { email: to.email, name: to.name };
  }

  const from = envelope.participants.find(
    (p) => p.role === "from" && notSelf(p.email),
  );
  if (from) return { email: from.email, name: from.name };

  const anyone = envelope.participants.find((p) => notSelf(p.email));
  return { email: anyone?.email ?? null, name: anyone?.name ?? null };
}

function capBody(text: string | null | undefined): string | null {
  if (!text) return null;
  const plain = text.replace(/\s+\n/g, "\n").trim();
  if (!plain) return null;
  return plain.length > MESSAGE_BODY_CAP ? plain.slice(0, MESSAGE_BODY_CAP) : plain;
}

export interface MessageStoreResult {
  stored: boolean;
  threadId?: string;
  reason?: string;
}

export async function persistMessageStage(
  admin: AdminClient,
  workspaceId: string,
  captureId: string,
  envelope: CaptureEnvelope,
  userEmail: string | null,
): Promise<MessageStoreResult> {
  if (envelope.captureType !== "message") {
    return { stored: false, reason: "not_a_message" };
  }

  const extracted = envelope.extracted as Record<string, unknown>;
  const isOutbound = extracted.isSentByUser === true;
  const counterparty = resolveCounterparty(envelope, userEmail);

  const body =
    capBody(envelope.bodyText) ??
    capBody(typeof extracted.snippet === "string" ? extracted.snippet : null);

  const provider = envelope.sourceType;
  const channel = channelForSource(envelope.sourceType);
  const externalThreadId =
    envelope.threadId ??
    (counterparty.email
      ? `${channel}:${counterparty.email.toLowerCase()}`
      : `${channel}:message:${envelope.externalId}`);

  const personId = counterparty.email
    ? ((await findPersonIdsByEmail(admin, workspaceId, counterparty.email))[0] ??
      null)
    : null;

  const occurredAt = envelope.occurredAt ?? new Date().toISOString();
  const bodyExpiresAt = body
    ? new Date(
        Date.now() + MESSAGE_BODY_TTL_DAYS * 24 * 60 * 60 * 1000,
      ).toISOString()
    : null;

  // Thread: upsert on the provider's conversation identity.
  const { data: thread, error: threadError } = await admin
    .from("conversation_threads")
    .upsert(
      {
        workspace_id: workspaceId,
        person_id: personId,
        counterparty_email: counterparty.email?.toLowerCase() ?? null,
        channel,
        provider,
        external_thread_id: externalThreadId,
        subject: envelope.title,
        last_message_at: occurredAt,
      } as never,
      { onConflict: "workspace_id,provider,external_thread_id" },
    )
    .select("id, person_id")
    .single();

  if (threadError || !thread) {
    console.warn(
      `[ingest/message-store] thread upsert failed for ${provider}/${envelope.externalId}:`,
      threadError?.message,
    );
    return { stored: false, reason: "thread_upsert_failed" };
  }

  const threadRow = thread as { id: string; person_id: string | null };

  // A thread created before the counterparty was born gets linked once the
  // person exists.
  if (!threadRow.person_id && personId) {
    await admin
      .from("conversation_threads")
      .update({ person_id: personId } as never)
      .eq("id", threadRow.id);
  }

  // Message: dedupe rides the same identity as capture_events.
  const { error: messageError } = await admin
    .from("conversation_messages")
    .insert({
      workspace_id: workspaceId,
      thread_id: threadRow.id,
      capture_event_id: captureId,
      direction: isOutbound ? "out" : "in",
      author_email: isOutbound
        ? (userEmail ?? null)
        : (counterparty.email ?? null),
      author_name: isOutbound ? null : counterparty.name,
      body_text: body,
      body_expires_at: bodyExpiresAt,
      occurred_at: occurredAt,
      source_type: envelope.sourceType,
      source_external_id: envelope.externalId,
    } as never);

  if (messageError) {
    // 23505 = duplicate delivery (webhook/backfill race) — idempotent no-op.
    if (messageError.code === "23505") {
      return { stored: false, threadId: threadRow.id, reason: "duplicate" };
    }
    console.warn(
      `[ingest/message-store] message insert failed for ${provider}/${envelope.externalId}:`,
      messageError.message,
    );
    return { stored: false, threadId: threadRow.id, reason: "message_insert_failed" };
  }

  // Thread roll-up: message count + latest activity. Best-effort; a failed
  // roll-up never fails ingest.
  const { count } = await admin
    .from("conversation_messages")
    .select("id", { count: "exact", head: true })
    .eq("thread_id", threadRow.id);
  await admin
    .from("conversation_threads")
    .update({
      message_count: count ?? 1,
      last_message_at: occurredAt,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", threadRow.id);

  return { stored: true, threadId: threadRow.id };
}

/**
 * Birth hook (Phase 2): when a person record is created, link any
 * person-null threads whose counterparty matches their email.
 */
export async function resolveThreadsForBornPerson(
  admin: AdminClient,
  workspaceId: string,
  personId: string,
  email: string | null,
): Promise<void> {
  const normalized = email?.trim().toLowerCase();
  if (!normalized) return;
  // Best-effort: thread resolution must never fail a record birth.
  try {
    const { error } = await admin
      .from("conversation_threads")
      .update({ person_id: personId, updated_at: new Date().toISOString() } as never)
      .eq("workspace_id", workspaceId)
      .is("person_id", null)
      .eq("counterparty_email", normalized);
    if (error) {
      console.warn(
        `[ingest/message-store] thread resolution failed for person ${personId}:`,
        error.message,
      );
    }
  } catch (resolutionError) {
    console.warn(
      `[ingest/message-store] thread resolution threw for person ${personId}:`,
      resolutionError instanceof Error ? resolutionError.message : resolutionError,
    );
  }
}
