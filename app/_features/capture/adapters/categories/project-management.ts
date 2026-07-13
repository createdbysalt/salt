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
import type { PersonSignals } from "@/app/_features/capture/services/system-plays/person-signals";
import type { CaptureSourceType } from "@/app/_features/capture/types";

type ProjectManagementProvider = "asana" | "linear" | "jira" | "trello" | "monday";

const PM_PROVIDERS: ProjectManagementProvider[] = [
  "asana",
  "linear",
  "jira",
  "trello",
  "monday",
];

const PM_TRIGGER_SLUGS: Record<ProjectManagementProvider, string[]> = {
  asana: [], // No triggers available yet - backfill only
  linear: [], // No triggers available yet - backfill only
  jira: [], // No triggers available yet - backfill only
  trello: [], // No triggers available yet - backfill only
  monday: [], // No triggers available yet - backfill only
};

function derivePmSignals(
  envelopes: readonly CaptureEnvelope[],
  _context: SignalDerivationContext
): Map<string, PersonSignals> {
  const contacts = new Map<string, PersonSignals>();

  for (const envelope of envelopes) {
    if (!isPmSource(envelope.sourceType)) continue;

    for (const participant of envelope.participants) {
      if (!participant.email) continue;

      contacts.set(participant.email, {
        ...contacts.get(participant.email),
      });
    }
  }

  return contacts;
}

function isPmSource(sourceType: CaptureSourceType): boolean {
  return PM_PROVIDERS.includes(sourceType as ProjectManagementProvider);
}

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

export function createProjectManagementCategoryAdapter(
  provider: ProjectManagementProvider
): CaptureAdapter {
  const triggerSlugs = PM_TRIGGER_SLUGS[provider] ?? [];

  return {
    sourceType: provider as CaptureSourceType,
    toolkit: provider,
    triggerSlugs,
    deriveSignals: derivePmSignals,

    normalize(payload: unknown): CaptureEnvelope | null {
      return normalizeGenericPm(payload, provider as CaptureSourceType);
    },
  };
}

export const projectManagementCategoryAdapters = PM_PROVIDERS.map(
  createProjectManagementCategoryAdapter
);

export function getProjectManagementAdapter(
  provider: string
): CaptureAdapter | null {
  if (!PM_PROVIDERS.includes(provider as ProjectManagementProvider)) {
    return null;
  }
  return createProjectManagementCategoryAdapter(
    provider as ProjectManagementProvider
  );
}
