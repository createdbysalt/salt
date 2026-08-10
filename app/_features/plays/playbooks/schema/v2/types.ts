/**
 * Playbook Architecture v2 Types
 *
 * Memory playbooks (layer: learn):
 *   - procedure: Human-readable explanation (Overview tab)
 *   - fill_rules: Engine-compatible rules (Advanced tab)
 *
 * Action playbooks (layer: act):
 *   - steps: Workflow execution
 *   - instructions: Guidelines and examples
 */

import type { ConnectorCategory } from "@/app/_lib/composio/enrichment/types";
import type {
  ProfileFillRule,
  ProfileFieldKey,
} from "../../records-engine/types";

export type PlaybookLayer = "learn" | "act";

/**
 * Playbook section (memory domain).
 *
 * Playbooks are act-layer only: they prepare work within a section. Memory
 * maintenance (the retired `_meta` section) is owned by Memory Care
 * (`app/_features/memory/care`), not by playbooks.
 */
export type PlaybookSection =
  | "relationships"
  | "work"
  | "billing"
  | "files"
  | "meetings"
  | "me"
  | "connections"
  | "notes"
  | "communication";

export type PlaybookTriggerType = "signal" | "schedule" | "manual";

export interface PlaybookSignalTrigger {
  type: "signal";
  /** Single signal (legacy single-file playbooks) */
  signal?: string;
  /** Multiple signals (v2 packages like duplicate-detector, memory-hygiene) */
  signals?: string[];
  surface?: string;
  /**
   * Minimum play-fit score (0-100) required to auto-dispatch this playbook.
   * If capture's fit score is below this, the play won't queue automatically.
   * Default: 70 for act-layer, uses workspace threshold for learn-layer.
   */
  confidence_threshold?: number;
}

export interface PlaybookScheduleTrigger {
  type: "schedule";
  cron: string;
  timezone?: string;
}

export interface PlaybookManualTrigger {
  type: "manual";
}

export type PlaybookTrigger =
  | PlaybookSignalTrigger
  | PlaybookScheduleTrigger
  | PlaybookManualTrigger;

export interface PlaybookRequirements {
  categories?: {
    required?: ConnectorCategory[];
    optional?: ConnectorCategory[];
  };
  capabilities?: {
    required?: string[];
    optional?: string[];
  };
}

/* ─────────────────────────────────────────────────────────────────────────────
 * MEMORY PLAYBOOK TYPES (layer: learn)
 * ───────────────────────────────────────────────────────────────────────────── */

/** What Salt learns - user-friendly field description */
export interface PlaybookLearnsItem {
  label: string;
  description: string;
  confidence_sources: string;
}

/** Record type this playbook manages (for unified Memory Records playbook) */
export interface PlaybookManagesItem {
  record_type: string;
  description: string;
}

/**
 * Memory playbook policy.
 * - User-friendly fields for Overview tab
 * - Engine format (fill_rules) for Advanced tab
 */
export interface PlaybookMemoryPolicy {
  /** Auto-apply threshold (0-100). Rules >= this apply automatically. */
  auto_apply_threshold: number;

  /* ── User-friendly Overview fields ── */

  /** One-line summary of what this playbook does */
  summary?: string;

  /** Record types this playbook manages (for unified Memory Records) */
  manages?: PlaybookManagesItem[];

  /** When Salt updates records (user-friendly triggers) */
  runs_when?: string[];

  /** What Salt figures out (user-friendly field descriptions) */
  learns?: PlaybookLearnsItem[];

  /** Plain language explanation of how confidence works */
  confidence_explanation?: string;

  /** Example review items users might see */
  review_examples?: string[];

  /** Detailed procedure explanation (markdown) */
  procedure: string;

  /* ── Engine fields (Advanced tab) ── */

  /** Signals this playbook responds to (from signal registry). */
  signals: string[];

  /** Fields this playbook manages. */
  fields: ProfileFieldKey[];

  /** Fill rules in engine-compatible format. */
  fill_rules: ProfileFillRule[];

  /** Fallback when no rule matches. */
  fallback?: {
    enabled: boolean;
    default_value?: string;
    default_confidence?: number;
  };
}

/* ─────────────────────────────────────────────────────────────────────────────
 * ACTION PLAYBOOK TYPES (layer: act)
 * ───────────────────────────────────────────────────────────────────────────── */

export interface PlaybookFetchStep {
  step: "fetch";
  id: string;
  from: string;
  where?: Record<string, unknown>;
  select?: string[];
  limit?: number;
  groupBy?: string[];
  having?: Record<string, unknown>;
  optional?: boolean;
}

export interface PlaybookClassifyRule {
  if: string;
  then: string | Record<string, unknown>;
}

export interface PlaybookClassifyStep {
  step: "classify";
  id: string;
  input?: string;
  forEach?: string;
  rules: PlaybookClassifyRule[];
  else?: string | Record<string, unknown>;
}

export interface PlaybookDraftStep {
  step: "draft";
  id: string;
  prompt: string;
  /** Run the prompt once per item of the named source list ({{item.*}} in the prompt). */
  forEach?: string;
  max_tokens?: number;
}

export interface PlaybookBranchStep {
  step: "branch";
  id?: string;
  if?: string;
  steps?: PlaybookStep[];
}

/**
 * Per-step gate, canonical on every step type:
 * - required: always pause for a human, never earned away
 * - ask: pause until earned autonomy for this playbook+tool
 * - auto (default): workspace trust dial is the ceiling
 *
 * Executable on action steps; on other step types it is declared intent
 * consumed by the output gate and UI.
 */
export type PlaybookStepApproval = "auto" | "ask" | "required";

export interface PlaybookActionStep {
  step: "action";
  id?: string;
  tool: string;
  args?: Record<string, unknown>;
  /** @deprecated Use `approval: "ask"` instead. */
  needsApproval?: boolean;
  approval?: PlaybookStepApproval;
}

export type PlaybookStep =
  | PlaybookFetchStep
  | PlaybookClassifyStep
  | PlaybookDraftStep
  | PlaybookBranchStep
  | PlaybookActionStep;

export interface PlaybookExample {
  label: string;
  content: string;
  context?: string;
}

export interface PlaybookReference {
  label: string;
  type: "url" | "file" | "text";
  value: string;
  notes?: string;
}

export interface PlaybookActionInstructions {
  system?: string;
  guidelines?: string[];
  avoid?: string[];
  examples?: PlaybookExample[];
  references?: PlaybookReference[];
}

/* ─────────────────────────────────────────────────────────────────────────────
 * SHARED TYPES
 * ───────────────────────────────────────────────────────────────────────────── */

export type PlaybookOutputType =
  | "email_draft"
  | "notification"
  | "memory_update"
  | "finding"
  | "briefing";

/**
 * Output gate after parsing. The schema accepts the legacy modes
 * (none/per_entity/batch) and normalizes them: none → auto, the rest → ask.
 */
export type PlaybookApprovalMode = "auto" | "ask";

export interface PlaybookOutput {
  type: PlaybookOutputType;
  approval?: PlaybookApprovalMode;
}

export interface PlaybookValueModel {
  kind: string;
  estimate?: number;
}

export interface SectionMetadata {
  name: string;
  slug: PlaybookSection;
  description: string;
  icon: string;
  memory_types: string[];
  signals: string[];
  templates?: string[];
}

/* ─────────────────────────────────────────────────────────────────────────────
 * EDITABILITY MODEL
 * ─────────────────────────────────────────────────────────────────────────────
 * - Template playbooks → read-only base, can be cloned and customized
 * - Other playbooks → fully editable
 * ("system" is retained for historical origins; no current playbook section
 * maps to it since the `_meta` section was retired in favor of Memory Care.)
 * ───────────────────────────────────────────────────────────────────────────── */

export type PlaybookCategory = "system" | "template" | "custom";

/* ─────────────────────────────────────────────────────────────────────────────
 * THE UNIFIED PLAYBOOK DEFINITION
 * ───────────────────────────────────────────────────────────────────────────── */

export interface PlaybookDefinitionV2 {
  /* ── Core identity ── */
  name: string;
  slug: string;
  version: string;
  description: string;

  /* ── Classification ── */
  section: PlaybookSection;
  layer: PlaybookLayer;

  /**
   * Whether this playbook is a template that can be cloned and customized.
   * Templates are read-only but serve as starting points for custom playbooks.
   */
  template?: boolean;

  /* ── Execution ── */
  trigger: PlaybookTrigger;
  triggers?: PlaybookTrigger[];
  requirements?: PlaybookRequirements;
  output: PlaybookOutput;
  value?: PlaybookValueModel;

  /* ── Memory playbook (layer: learn) ── */
  policy?: PlaybookMemoryPolicy;

  /* ── Action playbook (layer: act) ── */
  voice?: string;
  steps?: PlaybookStep[];
  instructions?: PlaybookActionInstructions;
  /**
   * Single-document canon: tool allowlist declared in the definition
   * (replaces tools.yaml). When present, every action step's tool is
   * validated against this list at parse time.
   */
  tools?: string[];
}

/* ─────────────────────────────────────────────────────────────────────────────
 * PARSING TYPES
 * ───────────────────────────────────────────────────────────────────────────── */

export interface ParsedPlaybookV2 {
  definition: PlaybookDefinitionV2;
  sectionMeta: SectionMetadata | null;
  validationErrors: PlaybookValidationError[];

  /** Package directory path if this is a directory-based playbook */
  packagePath?: string;
  /** Whether the package has a scripts/run.ts execution script */
  hasScript?: boolean;
  /** Whether the package has a PLAYBOOK.md instruction file */
  hasPlaybookMd?: boolean;
}

export interface PlaybookValidationError {
  path: string;
  message: string;
}

export interface PlaybookValidationResult {
  valid: boolean;
  errors: PlaybookValidationError[];
}

/* ─────────────────────────────────────────────────────────────────────────────
 * VOICE PROFILES
 * ───────────────────────────────────────────────────────────────────────────── */

export type VoiceProfileType = "salt" | "custom";

export interface VoiceProfile {
  name: string;
  slug: string;
  type: VoiceProfileType;
  tone: string;
  instructions: string;
  sign_off?: string;
  workspace_id: string | null;
}

export const SALT_PROVIDED_VOICES: VoiceProfile[] = [
  {
    name: "Billing",
    slug: "billing",
    type: "salt",
    tone: "professional, clear, firm",
    instructions: `Be direct about amounts and dates.
Use polite but firm language.
Keep messages under 150 words.`,
    sign_off: "Best regards",
    workspace_id: null,
  },
  {
    name: "Follow-up",
    slug: "follow-up",
    type: "salt",
    tone: "warm, casual, non-pushy",
    instructions: `Use contractions.
Reference something specific from last contact.
Keep it brief, no pressure.`,
    sign_off: "Cheers",
    workspace_id: null,
  },
  {
    name: "Brief",
    slug: "brief",
    type: "salt",
    tone: "concise, factual, scannable",
    instructions: `Use bullet points.
Lead with the most important info.
No pleasantries or filler.`,
    workspace_id: null,
  },
];

/* ─────────────────────────────────────────────────────────────────────────────
 * SECTION METADATA
 * ───────────────────────────────────────────────────────────────────────────── */

export const SECTION_METADATA: Record<PlaybookSection, SectionMetadata> = {
  relationships: {
    name: "Relationships",
    slug: "relationships",
    description: "People and organizations — who you know",
    icon: "users",
    memory_types: ["person", "organization", "conversation"],
    signals: [
      "person_created",
      "person_updated",
      "org_created",
      "org_updated",
      "person_no_contact_30_days",
      "entity_learning_extracted",
    ],
    templates: ["memory", "health", "follow-up", "reply-draft", "digest"],
  },
  work: {
    name: "Work",
    slug: "work",
    description: "Projects, tasks, and deliverables",
    icon: "briefcase",
    memory_types: ["work"],
    signals: [
      "work_created",
      "work_updated",
      "work_is_blocked",
      "work_has_completed_deliverable",
    ],
    templates: ["memory", "blocker-watch"],
  },
  billing: {
    name: "Billing",
    slug: "billing",
    description: "Cash flow, invoices, and payments",
    icon: "credit-card",
    memory_types: ["billing_record"],
    signals: [
      "billing_created",
      "billing_updated",
      "billing_payment_matched",
      "billing_due_date_passed",
    ],
    templates: ["memory", "invoice-reminder", "payment-received", "cash-runway"],
  },
  files: {
    name: "Files",
    slug: "files",
    description: "Documents and attachments",
    icon: "file",
    memory_types: ["file"],
    signals: [
      "file_signature_event_sent",
      "file_signature_event_signed",
    ],
    templates: ["memory"],
  },
  meetings: {
    name: "Meetings",
    slug: "meetings",
    description: "Scheduled time with others",
    icon: "calendar",
    memory_types: ["meeting"],
    signals: [
      "meeting_created",
      "meeting_end_passed",
      "meeting_has_attendance_evidence",
    ],
    templates: ["memory", "prep", "recap"],
  },
  me: {
    name: "Me",
    slug: "me",
    description: "Your profile and preferences",
    icon: "user",
    memory_types: ["operator", "workspace"],
    // Workspace-scoped onboarding lives here (getting-started playbook).
    signals: ["connector_connected"],
    templates: ["memory"],
  },
  connections: {
    name: "Connections",
    slug: "connections",
    description: "Entity relationships and links",
    icon: "link",
    memory_types: [],
    signals: [
      "connection_inferred",
      "connection_strengthened",
      "relationship_at_risk",
      "capture_email_received",
      "capture_email_sent",
      "capture_meeting_completed",
      "billing_payment_matched",
      "file_shared",
    ],
    templates: ["memory"],
  },
  notes: {
    name: "Notes",
    slug: "notes",
    description: "Captured notes, preferences, and context",
    icon: "file-text",
    memory_types: ["note"],
    signals: [
      "note_created",
      "note_flagged",
      "preference_detected",
      "context_extracted",
      "capture_processed",
    ],
    templates: ["memory", "intake", "lifecycle"],
  },
  communication: {
    name: "Communication",
    slug: "communication",
    description: "Email intelligence and inbox organization",
    icon: "mail",
    memory_types: ["capture"],
    signals: [
      "capture_email_received",
      "capture_email_sent",
      "email_urgency_high",
      "email_classified_action_required",
      "email_classified_money_moves",
      "email_classified_opportunities",
      "email_classified_updates",
      "email_classified_subscribed",
      "email_classified_noise",
    ],
    templates: ["email-triage", "auto-label-inbox", "auto-archive-noise", "email-digest", "setup-inbox-labels"],
  },
};

/* ─────────────────────────────────────────────────────────────────────────────
 * EDITABILITY HELPERS
 * ───────────────────────────────────────────────────────────────────────────── */

/**
 * Derives the playbook category from the template flag.
 * - Template: marked as template (read-only base, cloneable)
 * - Custom: everything else (fully editable)
 */
export function getPlaybookCategory(
  definition: Pick<PlaybookDefinitionV2, "section" | "template">
): PlaybookCategory {
  if (definition.template) return "template";
  return "custom";
}

/**
 * Whether a playbook is locked (cannot be edited).
 * No current playbook is locked — Memory Care capabilities are not playbooks.
 */
export function isPlaybookLocked(
  _definition: Pick<PlaybookDefinitionV2, "section">
): boolean {
  return false;
}

/**
 * Whether a playbook can be edited by the user.
 * Templates cannot be edited directly (clone first).
 */
export function isPlaybookEditable(
  definition: Pick<PlaybookDefinitionV2, "section" | "template">
): boolean {
  return !definition.template;
}

/**
 * Whether a playbook can be cloned to create a custom version.
 * Templates are designed for this.
 */
export function isPlaybookCloneable(
  definition: Pick<PlaybookDefinitionV2, "section" | "template">
): boolean {
  return definition.template === true;
}
