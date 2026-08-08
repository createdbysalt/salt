/**
 * Me Activity mappers — keep in sync with the Me record surfaces.
 *
 * Pure functions (no supabase imports) turning raw operator-memory rows into
 * the shared timeline entry shape rendered by ProfileActivityTimeline.
 * One row may emit multiple entries (e.g. an AI fact yields proposed + confirmed).
 *
 * Event taxonomy (keeper-field-contracts plan, "Me Activity Tab — Content
 * Specification"):
 *  1–5  memory facts (proposed / confirmed / added / revised / forgotten)
 *  6    goals (set / completed / paused / dropped)
 *  7    goal progress updated by Salt (ai_progress.computed_at — previously
 *       SKIPPED because the JSONB had no timestamp; the versioned writer in
 *       me/goals/recompute.ts now stamps computed_at, making this truthful)
 *  8–9  identity + business field updates via profile_field_provenance
 *       (entity_type 'operator' / 'workspace')
 * 10–11 voice profile updated / Salt learned your style
 * 12    ICP segments (proposed / confirmed / dismissed / added)
 * 13    services (added / updated / AI enrichment)
 * 14    Me-scoped notes
 *
 * Voice families 10–11 share one updated_at, so a voice row emits a single
 * best-truth entry, not both.
 *
 * When adding a new Me surface: mapper here → fetch in getOperatorActivity
 * (queries.ts) → unit test in activity.test.ts.
 * Full checklist: docs/guides/memory-activity-parity.md
 */
import type { ProfileActivityTimelineEntry } from "@/app/_features/people/utils/activity";

/** Two timestamps within this window are treated as the same write. */
const SAME_WRITE_EPSILON_MS = 2000;

function isMeaningfullyAfter(later: string | null, earlier: string | null): boolean {
  if (!later || !earlier) return false;
  const a = new Date(later).getTime();
  const b = new Date(earlier).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return false;
  return a - b > SAME_WRITE_EPSILON_MS;
}

function contentPreview(content: string, max = 60): string {
  return content.length > max ? `${content.slice(0, max)}…` : content;
}

// ─── Families 1–5: memory facts ─────────────────────────────────────────────

export type OperatorFactActivityInput = {
  id: string;
  value: string;
  status: "proposed" | "confirmed" | "dismissed";
  source: "manual" | "ai_capture" | "ask_salt" | "draft_edit";
  createdAt: string;
  updatedAt: string;
  confirmedAt: string | null;
};

/**
 * A fact row can emit up to three entries: creation (proposed or added),
 * confirmation/revision, and forget. There is no event log for facts, so
 * transitions are reconstructed from status/source/timestamps:
 * - `confirmed_at` meaningfully after `created_at` = a real confirm event
 *   (fixes the "confirmed_at fetched but never emitted" bug).
 * - a confirm whose source is `manual`/`draft_edit` came through
 *   reviseOperatorFact (revising also confirms) → "Memory revised".
 * - `status='dismissed'` = the user asked Salt to forget it (dismissed rows
 *   are events, not rows to hide).
 */
export function mapOperatorFactToActivityEntries(
  fact: OperatorFactActivityInput,
): ProfileActivityTimelineEntry[] {
  const entries: ProfileActivityTimelineEntry[] = [];
  const fromAi = fact.source === "ai_capture";

  if (fromAi) {
    entries.push({
      id: `fact-proposed-${fact.id}`,
      at: fact.createdAt,
      kind: "salt",
      label: "Salt proposed a new memory",
      detail: fact.value,
      source: "ai_fallback",
      status: fact.status === "proposed" ? "pending" : "applied",
    });
  } else {
    entries.push({
      id: `fact-added-${fact.id}`,
      at: fact.createdAt,
      kind: "user",
      label: "Memory added",
      detail: fact.value,
      source: "manual",
      status: "applied",
    });
  }

  if (isMeaningfullyAfter(fact.confirmedAt, fact.createdAt)) {
    const revised = fact.source === "manual" || fact.source === "draft_edit";
    entries.push({
      id: revised ? `fact-revised-${fact.id}` : `fact-confirmed-${fact.id}`,
      at: fact.confirmedAt as string,
      kind: "user",
      label: revised ? "Memory revised" : "Memory confirmed",
      detail: fact.value,
      source: revised ? "manual" : "ai_fallback",
      status: "applied",
    });
  }

  if (fact.status === "dismissed") {
    entries.push({
      id: `fact-forgotten-${fact.id}`,
      at: fact.updatedAt,
      kind: "user",
      label: "You asked Salt to forget a memory",
      detail: fact.value,
      source: "manual",
      status: "applied",
    });
  }

  return entries;
}

// ─── Family 6: goals ────────────────────────────────────────────────────────

export type OperatorGoalActivityInput = {
  id: string;
  title: string;
  status: "active" | "paused" | "done" | "dropped";
  createdAt: string;
  updatedAt: string;
};

const GOAL_TRANSITION_LABELS: Record<"paused" | "done" | "dropped", string> = {
  done: "Goal completed",
  paused: "Goal paused",
  dropped: "Goal dropped",
};

/**
 * Every goal emits "Goal set" at created_at; non-active statuses add a
 * transition entry timestamped at updated_at (fixes the "completed goals
 * appear at created_at" bug — updated_at is the best transition proxy until
 * transitions are logged).
 */
export function mapOperatorGoalToActivityEntries(
  goal: OperatorGoalActivityInput,
): ProfileActivityTimelineEntry[] {
  const entries: ProfileActivityTimelineEntry[] = [
    {
      id: `goal-set-${goal.id}`,
      at: goal.createdAt,
      kind: "user",
      label: "Goal set",
      detail: goal.title,
      source: "manual",
      status: "applied",
    },
  ];

  if (goal.status !== "active") {
    entries.push({
      id: `goal-${goal.status}-${goal.id}`,
      at: goal.updatedAt,
      kind: "user",
      label: GOAL_TRANSITION_LABELS[goal.status],
      detail: goal.title,
      source: "manual",
      status: "applied",
    });
  }

  return entries;
}

// ─── Family 7: goal progress updated by Salt ────────────────────────────────

export type GoalAiProgressActivityInput = {
  id: string;
  title: string;
  /** Raw operator_goals.ai_progress JSON (may be legacy or empty). */
  aiProgress: unknown;
};

/**
 * Emits "Salt updated goal progress" at ai_progress.computed_at. Only rows
 * written by the versioned writer (me/goals/recompute.ts) carry computed_at;
 * legacy/empty ai_progress emits nothing — the event only exists when the
 * derivation actually ran (kind salt / auto-applied per the spec table).
 */
export function mapGoalAiProgressToActivityEntry(
  goal: GoalAiProgressActivityInput,
): ProfileActivityTimelineEntry | null {
  if (!goal.aiProgress || typeof goal.aiProgress !== "object") return null;
  const progress = goal.aiProgress as {
    computed_at?: unknown;
    percent?: unknown;
    unavailable?: unknown;
  };
  if (typeof progress.computed_at !== "string" || progress.computed_at === "") {
    return null;
  }

  const detail =
    progress.unavailable === true
      ? `${goal.title} · progress not measurable yet`
      : typeof progress.percent === "number"
        ? `${goal.title} · ${progress.percent}% of target`
        : goal.title;

  return {
    id: `goal-ai-progress-${goal.id}-${progress.computed_at}`,
    at: progress.computed_at,
    kind: "salt",
    label: "Salt updated goal progress",
    detail,
    source: "ai_fallback",
    status: "applied",
  };
}

// ─── Families 8–9: identity/business field provenance ───────────────────────

export type OperatorProvenanceActivityInput = {
  entityType: "operator" | "workspace";
  field: string;
  value: string | null;
  source: "rule" | "ai_fallback" | "manual";
  because: string | null;
  confidence: number | null;
  status: "applied" | "pending";
  setAt: string;
};

export function meProfileFieldLabel(field: string): string {
  return field.replaceAll("_", " ");
}

/**
 * profile_field_provenance rows with entity_type 'operator' (identity) or
 * 'workspace' (business). The CHECK widening + provenance writes land in
 * 6.5 — this mapper simply renders rows once writes flow.
 */
export function mapOperatorProvenanceToActivityEntry(
  provenance: OperatorProvenanceActivityInput,
): ProfileActivityTimelineEntry {
  const fieldLabel =
    provenance.entityType === "workspace"
      ? `business ${meProfileFieldLabel(provenance.field)}`
      : meProfileFieldLabel(provenance.field);
  const valueLabel = provenance.value ?? "—";
  const detailParts = [
    `${fieldLabel} → ${valueLabel}`,
    provenance.because,
    provenance.confidence != null ? `${provenance.confidence}% sure` : null,
  ].filter(Boolean) as string[];

  const label =
    provenance.source === "manual"
      ? `You updated ${fieldLabel}`
      : provenance.status === "pending"
        ? `Salt suggested ${fieldLabel}`
        : `Salt updated ${fieldLabel}`;

  return {
    id: `me-profile-${provenance.entityType}-${provenance.field}-${provenance.setAt}`,
    at: provenance.setAt,
    kind: provenance.source === "manual" ? "user" : "salt",
    label,
    detail: detailParts.join(" · "),
    source: provenance.source,
    status: provenance.status,
  };
}

// ─── Families 10–11: voice profile ──────────────────────────────────────────

export type OperatorVoiceActivityInput = {
  learnedStyle: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * operator_voice_profile has one shared updated_at and no per-column
 * timestamps, so a row emits at most ONE entry — the most truthful single
 * event: learned style present → "Salt learned your style" (family 11),
 * otherwise a post-create update → "Voice profile updated" (family 10).
 * Emitting both would double-report the same write.
 */
export function mapOperatorVoiceToActivityEntries(
  voice: OperatorVoiceActivityInput,
): ProfileActivityTimelineEntry[] {
  if (voice.learnedStyle && voice.learnedStyle.trim() !== "") {
    return [
      {
        id: `voice-learned-${voice.updatedAt}`,
        at: voice.updatedAt,
        kind: "salt",
        label: "Salt learned your style from writing samples",
        detail: contentPreview(voice.learnedStyle),
        source: "ai_fallback",
        status: "applied",
      },
    ];
  }

  if (isMeaningfullyAfter(voice.updatedAt, voice.createdAt)) {
    return [
      {
        id: `voice-updated-${voice.updatedAt}`,
        at: voice.updatedAt,
        kind: "user",
        label: "Voice profile updated",
        detail: null,
        source: "manual",
        status: "applied",
      },
    ];
  }

  return [];
}

// ─── Family 12: ICP segments ────────────────────────────────────────────────

export type ICPSegmentActivityInput = {
  id: string;
  name: string;
  status: "active" | "proposed" | "dismissed";
  source: "manual" | "ai_capture";
  createdAt: string;
  updatedAt: string;
};

export function mapICPSegmentToActivityEntries(
  segment: ICPSegmentActivityInput,
): ProfileActivityTimelineEntry[] {
  const entries: ProfileActivityTimelineEntry[] = [];
  const fromAi = segment.source === "ai_capture";

  if (fromAi) {
    entries.push({
      id: `icp-proposed-${segment.id}`,
      at: segment.createdAt,
      kind: "salt",
      label: "Salt proposed an ICP segment",
      detail: segment.name,
      source: "ai_fallback",
      status: segment.status === "proposed" ? "pending" : "applied",
    });
  } else {
    entries.push({
      id: `icp-added-${segment.id}`,
      at: segment.createdAt,
      kind: "user",
      label: "ICP segment added",
      detail: segment.name,
      source: "manual",
      status: "applied",
    });
  }

  if (fromAi && segment.status === "active" && isMeaningfullyAfter(segment.updatedAt, segment.createdAt)) {
    entries.push({
      id: `icp-confirmed-${segment.id}`,
      at: segment.updatedAt,
      kind: "user",
      label: "ICP segment confirmed",
      detail: segment.name,
      source: "ai_fallback",
      status: "applied",
    });
  }

  if (segment.status === "dismissed") {
    entries.push({
      id: `icp-dismissed-${segment.id}`,
      at: segment.updatedAt,
      kind: "user",
      label: "ICP segment dismissed",
      detail: segment.name,
      source: "manual",
      status: "applied",
    });
  }

  return entries;
}

// ─── Family 13: services ────────────────────────────────────────────────────

export type ServiceActivityInput = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  /** The *_source column values for the AI-fillable fields. */
  fieldSources: Array<string | null | undefined>;
};

/** True when any AI-fillable field on the service was drafted by Salt. */
export function serviceHasAIEnrichment(
  fieldSources: Array<string | null | undefined>,
): boolean {
  return fieldSources.some((s) => s === "ai_proposed" || s === "ai_confirmed");
}

/**
 * Services emit "Service added" at created_at, plus (single shared
 * updated_at) either an AI-enrichment entry when any *_source column is
 * ai_proposed/ai_confirmed, or a plain "Service updated" entry.
 */
export function mapServiceToActivityEntries(
  service: ServiceActivityInput,
): ProfileActivityTimelineEntry[] {
  const entries: ProfileActivityTimelineEntry[] = [
    {
      id: `service-added-${service.id}`,
      at: service.createdAt,
      kind: "user",
      label: "Service added",
      detail: service.name,
      source: "manual",
      status: "applied",
    },
  ];

  const aiEnriched = serviceHasAIEnrichment(service.fieldSources);
  const updatedAfterCreate = isMeaningfullyAfter(service.updatedAt, service.createdAt);

  if (aiEnriched) {
    entries.push({
      id: `service-ai-enriched-${service.id}`,
      at: service.updatedAt,
      kind: "salt",
      label: "Salt generated service intelligence",
      detail: service.name,
      source: "ai_fallback",
      status: "applied",
    });
  } else if (updatedAfterCreate) {
    entries.push({
      id: `service-updated-${service.id}`,
      at: service.updatedAt,
      kind: "user",
      label: "Service updated",
      detail: service.name,
      source: "manual",
      status: "applied",
    });
  }

  return entries;
}

// ─── Family 14: Me-scoped notes ─────────────────────────────────────────────

export type OperatorNoteActivityInput = {
  id: string;
  title: string | null;
  content: string;
  tags: string[];
  createdAt: string;
};

export function mapOperatorNoteToActivityEntry(
  note: OperatorNoteActivityInput,
): ProfileActivityTimelineEntry {
  const detailParts: string[] = [];
  if (note.title) detailParts.push(note.title);
  if (note.tags.length > 0) detailParts.push(note.tags.join(", "));
  if (!note.title && note.content) detailParts.push(contentPreview(note.content));

  return {
    id: `me-note-${note.id}`,
    at: note.createdAt,
    kind: "user",
    label: "You added a note",
    detail: detailParts.length > 0 ? detailParts.join(" · ") : null,
    field: "note",
    source: "manual",
    status: "applied",
  };
}

// ─── Shared ─────────────────────────────────────────────────────────────────

export function sortActivityEntriesDesc(
  entries: ProfileActivityTimelineEntry[],
): ProfileActivityTimelineEntry[] {
  return [...entries].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}
