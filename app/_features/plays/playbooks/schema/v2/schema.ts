/**
 * Playbook v2 Zod Schema
 *
 * - Memory playbooks: procedure (Overview) + fill_rules (Advanced)
 * - Action playbooks: steps + instructions
 */

import { z } from "zod";

/* ─────────────────────────────────────────────────────────────────────────────
 * SHARED SCHEMAS
 * ───────────────────────────────────────────────────────────────────────────── */

const PlaybookSectionSchema = z.enum([
  "relationships",
  "work",
  "billing",
  "files",
  "meetings",
  "me",
  "connections",
  "notes",
  "communication",
]);

// `learn` stays in the enum even though no shipped playbook uses it (as of
// Phase 6 closeout, 2026-08-08): learn-layer Memory playbooks are Memory Care
// capabilities now, but the schema still validates policy-based definitions
// and `inferLayerFromV1Kind` maps legacy v1 profile playbooks onto it. The
// plays detail surface assumes act-layer only.
const PlaybookLayerSchema = z.enum(["learn", "act"]);

const ConnectorCategorySchema = z.enum([
  "email",
  "calendar",
  "billing",
  "crm",
  "meetings",
  "documents",
  "storage",
  "project_management",
]);

/**
 * Signal trigger schema - supports both single signal (legacy) and signals array (v2 packages).
 * Uses a union to maintain compatibility with discriminatedUnion.
 */
const PlaybookSignalTriggerSingleSchema = z.object({
  type: z.literal("signal"),
  signal: z.string().min(1),
  surface: z.string().optional(),
});

const PlaybookSignalTriggerMultiSchema = z.object({
  type: z.literal("signal"),
  signals: z.array(z.string().min(1)).min(1),
  surface: z.string().optional(),
});

const PlaybookSignalTriggerSchema = z.union([
  PlaybookSignalTriggerSingleSchema,
  PlaybookSignalTriggerMultiSchema,
]);

const PlaybookScheduleTriggerSchema = z.object({
  type: z.literal("schedule"),
  cron: z.string().regex(/^[\d\s*,/-]+$/, "Invalid cron expression"),
  timezone: z.string().optional(),
});

const PlaybookManualTriggerSchema = z.object({
  type: z.literal("manual"),
});

const PlaybookTriggerSchema = z.union([
  PlaybookSignalTriggerSingleSchema,
  PlaybookSignalTriggerMultiSchema,
  PlaybookScheduleTriggerSchema,
  PlaybookManualTriggerSchema,
]);

const PlaybookRequirementsSchema = z.object({
  categories: z.object({
    required: z.array(ConnectorCategorySchema).optional(),
    optional: z.array(ConnectorCategorySchema).optional(),
  }).optional(),
  capabilities: z.object({
    required: z.array(z.string()).optional(),
    optional: z.array(z.string()).optional(),
  }).optional(),
}).optional();

const PlaybookOutputTypeSchema = z.enum([
  "email_draft",
  "notification",
  "memory_update",
  "finding",
  "briefing",
]);

/**
 * Output gate vocabulary. Canonical values are `auto` (surface without
 * asking) and `ask` (queue for review); the legacy modes map onto them:
 * none → auto, per_entity → ask, batch → ask.
 */
const PlaybookApprovalModeSchema = z
  .enum(["auto", "ask", "none", "per_entity", "batch"])
  .transform((mode) =>
    mode === "none" ? "auto" : mode === "auto" ? "auto" : "ask"
  );

const PlaybookOutputSchema = z.object({
  type: PlaybookOutputTypeSchema,
  approval: PlaybookApprovalModeSchema.optional(),
});

const PlaybookValueModelSchema = z.object({
  kind: z.string().min(1),
  estimate: z.number().int().nonnegative().optional(), // Allow 0 for playbooks with no direct time savings
});

/* ─────────────────────────────────────────────────────────────────────────────
 * MEMORY PLAYBOOK SCHEMAS (layer: learn)
 * ───────────────────────────────────────────────────────────────────────────── */

// User-friendly "What Salt learns" item
const PlaybookLearnsItemSchema = z.object({
  label: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  confidence_sources: z.string().min(1).max(200),
});

// Record type managed by a unified playbook
const PlaybookManagesItemSchema = z.object({
  record_type: z.string().min(1).max(50),
  description: z.string().min(1).max(200),
});

// Engine-compatible fill rule format
const ProfileRuleConditionSchema = z.object({
  signal: z.string().min(1),
  op: z.enum(["eq", "neq", "exists", "not_exists", "gte"]),
  value: z.union([z.string(), z.number(), z.boolean()]).optional(),
});

const ProfileFillRuleSchema = z.object({
  id: z.string().min(1),
  field: z.string().min(1),
  when: ProfileRuleConditionSchema,
  set: z.object({
    value: z.string(),
  }),
  confidence: z.number().int().min(0).max(100),
  because: z.string(),
});

const PlaybookMemoryPolicySchema = z.object({
  auto_apply_threshold: z.number().int().min(0).max(100),

  // User-friendly Overview fields
  summary: z.string().min(1).max(500).optional(),
  manages: z.array(PlaybookManagesItemSchema).optional(),
  runs_when: z.array(z.string().min(1).max(200)).optional(),
  learns: z.array(PlaybookLearnsItemSchema).optional(),
  confidence_explanation: z.string().max(2000).optional(),
  review_examples: z.array(z.string().min(1).max(300)).optional(),

  // Detailed procedure explanation (markdown)
  procedure: z.string().min(1).max(50000),

  // Engine fields
  signals: z.array(z.string().min(1)).min(1),
  fields: z.array(z.string().min(1)).min(1),
  fill_rules: z.array(ProfileFillRuleSchema).min(1),
  fallback: z.object({
    enabled: z.boolean(),
    default_value: z.string().optional(),
    default_confidence: z.number().int().min(0).max(100).optional(),
  }).optional(),
});

/* ─────────────────────────────────────────────────────────────────────────────
 * ACTION PLAYBOOK SCHEMAS (layer: act)
 * ───────────────────────────────────────────────────────────────────────────── */

const PlaybookFetchStepSchema = z.object({
  step: z.literal("fetch"),
  id: z.string().min(1),
  from: z.string().min(1),
  where: z.record(z.unknown()).optional(),
  select: z.array(z.string()).optional(),
  limit: z.number().int().positive().optional(),
  groupBy: z.array(z.string()).optional(),
  having: z.record(z.unknown()).optional(),
  optional: z.boolean().optional(),
});

const PlaybookClassifyRuleSchema = z.object({
  if: z.string().min(1),
  then: z.union([z.string().min(1), z.record(z.unknown())]),
});

const PlaybookClassifyStepSchema = z.object({
  step: z.literal("classify"),
  id: z.string().min(1),
  input: z.string().optional(),
  forEach: z.string().optional(),
  rules: z.array(PlaybookClassifyRuleSchema).min(1),
  else: z.union([z.string(), z.record(z.unknown())]).optional(),
});

const PlaybookDraftStepSchema = z.object({
  step: z.literal("draft"),
  id: z.string().min(1),
  prompt: z.string().min(1),
  /**
   * When set, the prompt runs once per item of the named source list and the
   * step result is [{ item, draft }] — per-entity drafts (getting-started
   * reply pack, batch re-engagements). `{{item.*}}` interpolates the current
   * item inside the prompt.
   */
  forEach: z.string().optional(),
  max_tokens: z.number().int().positive().max(4096).optional(),
});

const PlaybookBranchStepSchema = z.object({
  step: z.literal("branch"),
  id: z.string().optional(),
  if: z.string().optional(),
  steps: z.array(z.any()).optional(),
});

/**
 * Per-step gate, canonical on every step type:
 * - required: always pause for a human, never earned away (money sends,
 *   destructive actions)
 * - ask: pause until the workspace has earned autonomy for this playbook+tool
 * - auto (default): workspace trust dial is the ceiling
 *
 * Gating is executable on action steps; on other step types it is declared
 * intent consumed by the output gate and UI.
 */
const PlaybookStepApprovalSchema = z.enum(["auto", "ask", "required"]);

const PlaybookActionStepSchema = z.object({
  step: z.literal("action"),
  id: z.string().optional(),
  tool: z.string().min(1),
  args: z.record(z.unknown()).optional(),
  /** @deprecated Use `approval: "ask"` instead. */
  needsApproval: z.boolean().optional(),
  approval: PlaybookStepApprovalSchema.optional(),
});

const PlaybookStepSchema = z.discriminatedUnion("step", [
  PlaybookFetchStepSchema,
  PlaybookClassifyStepSchema,
  PlaybookDraftStepSchema,
  PlaybookBranchStepSchema,
  PlaybookActionStepSchema,
]);

const PlaybookExampleSchema = z.object({
  label: z.string().min(1).max(100),
  content: z.string().min(1).max(5000),
  context: z.string().max(500).optional(),
});

const PlaybookReferenceSchema = z.object({
  label: z.string().min(1).max(100),
  type: z.enum(["url", "file", "text"]),
  value: z.string().min(1).max(2000),
  notes: z.string().max(500).optional(),
});

const PlaybookActionInstructionsSchema = z.object({
  system: z.string().max(5000).optional(),
  guidelines: z.array(z.string().min(1).max(500)).max(20).optional(),
  avoid: z.array(z.string().min(1).max(500)).max(20).optional(),
  examples: z.array(PlaybookExampleSchema).max(10).optional(),
  references: z.array(PlaybookReferenceSchema).max(20).optional(),
}).optional();

/* ─────────────────────────────────────────────────────────────────────────────
 * UNIFIED PLAYBOOK SCHEMA
 * ───────────────────────────────────────────────────────────────────────────── */

export const PlaybookDefinitionV2Schema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().regex(/^[a-z0-9-]+$/).optional(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  description: z.string().min(1).max(500),
  section: PlaybookSectionSchema,
  layer: PlaybookLayerSchema,
  template: z.boolean().optional(),
  trigger: PlaybookTriggerSchema.optional(),
  triggers: z.array(PlaybookTriggerSchema).optional(),
  requirements: PlaybookRequirementsSchema,
  output: PlaybookOutputSchema,
  value: PlaybookValueModelSchema.optional(),
  policy: PlaybookMemoryPolicySchema.optional(),
  voice: z.string().regex(/^[a-z0-9-]+$/).optional(),
  steps: z.array(PlaybookStepSchema).optional(),
  instructions: PlaybookActionInstructionsSchema,
  /**
   * Single-document canon: the tool allowlist lives in the definition, not a
   * sibling tools.yaml. When present, every action step's tool must be listed
   * here (validated below) — this is the declaration the consent UI renders.
   */
  tools: z.array(z.string().min(1)).optional(),
}).refine(
  (data) => data.trigger || (data.triggers && data.triggers.length > 0),
  { message: "Playbook must have either 'trigger' or 'triggers' defined", path: ["trigger"] }
).refine(
  (data) => data.layer !== "learn" || data.policy,
  { message: "Memory playbooks must have a policy section", path: ["policy"] }
).refine(
  (data) => data.layer !== "act" || data.steps?.length || data.instructions,
  { message: "Action playbooks must have steps or instructions", path: ["steps"] }
).refine(
  (data) => {
    if (!data.tools || !data.steps) return true;
    const allowed = new Set(data.tools);
    const undeclared = collectActionTools(data.steps).filter(
      (tool) => !allowed.has(tool)
    );
    return undeclared.length === 0;
  },
  {
    message:
      "Action step tools must be declared in the definition's `tools` allowlist",
    path: ["tools"],
  }
);

function collectActionTools(steps: unknown[]): string[] {
  const tools: string[] = [];
  for (const step of steps) {
    if (typeof step !== "object" || step === null) continue;
    const s = step as { step?: string; tool?: string; steps?: unknown[] };
    if (s.step === "action" && typeof s.tool === "string") {
      tools.push(s.tool);
    }
    if (Array.isArray(s.steps)) {
      tools.push(...collectActionTools(s.steps));
    }
  }
  return tools;
}

export type PlaybookDefinitionV2Input = z.input<typeof PlaybookDefinitionV2Schema>;
export type PlaybookDefinitionV2Output = z.output<typeof PlaybookDefinitionV2Schema>;

/* ─────────────────────────────────────────────────────────────────────────────
 * SECTION METADATA SCHEMA
 * ───────────────────────────────────────────────────────────────────────────── */

const SectionMetadataSchema = z.object({
  name: z.string().min(1).max(50),
  slug: PlaybookSectionSchema,
  description: z.string().min(1).max(200),
  icon: z.string().min(1),
  memory_types: z.array(z.string()),
  signals: z.array(z.string()),
  templates: z.array(z.string()).optional(),
});

export const SectionFileSchema = SectionMetadataSchema;

export type SectionMetadataInput = z.input<typeof SectionMetadataSchema>;

/* ─────────────────────────────────────────────────────────────────────────────
 * HELPERS
 * ───────────────────────────────────────────────────────────────────────────── */

export function inferSlugFromName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function inferSectionFromSlug(slug: string): z.infer<typeof PlaybookSectionSchema> | null {
  const mapping: Record<string, z.infer<typeof PlaybookSectionSchema>> = {
    // Current format
    "people-records": "relationships",
    "org-records": "relationships",
    "work-records": "work",
    "billing-records": "billing",
    "files-records": "files",
    "meetings-records": "meetings",
    "connections-records": "connections",
    "me-records": "me",
    "convos-records": "relationships",
    "follow-up": "relationships",
    "invoice-reminder": "billing",
    "invoice-chase": "billing",
    "payment-reminder": "billing",
    "cash-runway": "billing",
    "meeting-prep": "meetings",
    "meeting-recap": "meetings",
    "daily-briefing": "me",
  };
  return mapping[slug] ?? null;
}

export function mapV1LayerToV2(kind: "profile" | "acting"): "learn" | "act" {
  return kind === "profile" ? "learn" : "act";
}

export function mapV1PlayerToVoice(playerSlug: string): string | undefined {
  const mapping: Record<string, string | undefined> = {
    billing: "billing",
    "follow-up": "follow-up",
    brief: "brief",
  };
  return mapping[playerSlug];
}
