/**
 * Project Management Category Adapter (Captures V2 Phase 1).
 *
 * Handles PM sources: asana, linear, jira, trello, monday, etc.
 * Stub implementation — enable when connectors are wired.
 */

import type {
  CaptureAdapter,
  CaptureEnvelope,
  EnvelopeParticipant,
  SignalDerivationContext,
} from "../types";
import {
  emailEntity,
  firstParticipantEmailEntity,
  verbatimEntity,
} from "../feedback-entity";
import type { PersonSignals } from "@/app/_features/memory/records/person-signals";
import type { CaptureSourceType } from "@/app/_features/capture/types";

type KnownPmProvider = "asana" | "linear" | "jira" | "trello" | "monday";

const KNOWN_PM_PROVIDERS: KnownPmProvider[] = [
  "asana",
  "linear",
  "jira",
  "trello",
  "monday",
];

const PM_TRIGGER_SLUGS: Record<KnownPmProvider, string[]> = {
  asana: [], // No triggers available yet - backfill only
  linear: [], // No triggers available yet - backfill only
  jira: [], // No triggers available yet - backfill only
  trello: [], // No triggers available yet - backfill only
  monday: [], // No triggers available yet - backfill only
};

function isKnownPmProvider(provider: string): provider is KnownPmProvider {
  return KNOWN_PM_PROVIDERS.includes(provider as KnownPmProvider);
}

function derivePmSignals(
  envelopes: readonly CaptureEnvelope[],
  _context: SignalDerivationContext
): Map<string, PersonSignals> {
  const contacts = new Map<string, PersonSignals>();

  for (const envelope of envelopes) {
    // PM adapters already filter by category - process all envelopes
    for (const participant of envelope.participants) {
      if (!participant.email) continue;

      contacts.set(participant.email, {
        ...contacts.get(participant.email),
      });
    }
  }

  return contacts;
}

// PM adapters already filter by category - no need for source type check

function normalizeGenericPm(
  payload: unknown,
  sourceType: CaptureSourceType
): CaptureEnvelope | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;

  const externalId =
    (record.id as string) ??
    (record.taskId as string) ??
    (record.issueId as string) ??
    (record.cardId as string);
  if (!externalId) return null;

  const title =
    (record.title as string) ??
    (record.name as string) ??
    (record.summary as string) ??
    null;

  const assignee = record.assignee as Record<string, unknown> | undefined;
  const participants: EnvelopeParticipant[] = [];

  if (assignee?.email) {
    participants.push({
      email: (assignee.email as string).toLowerCase(),
      name: (assignee.name as string) ?? null,
      role: "other",
    });
  }

  return {
    sourceType,
    captureType: "task",
    externalId,
    title,
    occurredAt:
      (record.created_at as string) ??
      (record.createdAt as string) ??
      null,
    participants,
    threadId: (record.projectId as string) ?? (record.boardId as string) ?? null,
    extracted: {
      title,
      status: (record.status as string) ?? (record.state as string) ?? null,
      assignee_email: (assignee?.email as string)?.toLowerCase() ?? null,
      priority: (record.priority as string) ?? null,
      url: (record.url as string) ?? (record.permalink as string) ?? null,
    },
    raw: {
      taskId: externalId,
      source: "composio_trigger",
    },
    noise: null,
  };
}

/**
 * Create a project management adapter for ANY provider.
 * Known providers get specific parsing; unknown get generic extraction.
 */
export function createProjectManagementCategoryAdapter(provider: string): CaptureAdapter {
  const triggerSlugs = isKnownPmProvider(provider)
    ? PM_TRIGGER_SLUGS[provider]
    : []; // Unknown providers: triggers come from DB

  return {
    sourceType: provider,
    toolkit: provider,
    triggerSlugs,
    deriveSignals: derivePmSignals,

    extractFeedbackEntity(envelope) {
      return emailEntity(envelope, "assignee_email", "assignee");
    },

    normalize(payload: unknown): CaptureEnvelope | null {
      // All PM providers currently use generic extraction
      return normalizeGenericPm(payload, provider);
    },
  };
}

/** Known provider adapters (for backward compatibility). */
export const projectManagementCategoryAdapters = KNOWN_PM_PROVIDERS.map(
  createProjectManagementCategoryAdapter
);

/**
 * Get project management adapter for ANY provider in the PM category.
 * Always returns an adapter — unknown providers get generic extraction.
 */
export function getProjectManagementAdapter(provider: string): CaptureAdapter {
  return createProjectManagementCategoryAdapter(provider);
}
