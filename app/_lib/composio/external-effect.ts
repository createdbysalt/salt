import "server-only";

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { classifyToolByHeuristic } from "./tool-classification-heuristics";
import { COMPOSIO_TOOL_SLUGS } from "./tool-slugs";
import type { ToolRiskClass } from "./tool-policy-registry";

/**
 * External-effect classification — the billable boundary (pricing §1 Rule 2).
 *
 * A play is billable only when it performs at least one action that leaves
 * Salt: an email sent, an event created, a message posted, an invoice drafted
 * into a third-party system. Memory mutations, entity linking, and Memory Care
 * maintenance are LEARN-layer work and are never billed.
 *
 * Keeping this as a tool-contract property gives metering exactly one
 * classification point. `app/_lib/usage/` derives play billability from it and
 * never makes a per-play judgement call.
 *
 * Deliberately separate from `classification-store.ts`: that module sits on
 * the execution-critical path and resolves risk, which gates whether a tool
 * may run at all. Billing must never be able to break execution, so this
 * resolver keeps its own query and cache.
 */

export type ExternalEffectSource = "database" | "override" | "risk";

export interface ExternalEffectClassification {
  externalEffect: boolean;
  source: ExternalEffectSource;
  reason: string;
}

/**
 * Tools whose mutation is housekeeping inside the user's own account rather
 * than an effect a third party can observe. Charging for these would be
 * charging the user for Salt organizing their inbox.
 */
const NON_EXTERNAL_OVERRIDES: Record<string, string> = {
  [COMPOSIO_TOOL_SLUGS.GMAIL_ADD_LABEL_TO_EMAIL]:
    "Mailbox organization — no recipient observes it",
  [COMPOSIO_TOOL_SLUGS.GMAIL_REMOVE_LABEL_FROM_EMAIL]:
    "Mailbox organization — no recipient observes it",
  [COMPOSIO_TOOL_SLUGS.GMAIL_MODIFY_MESSAGE_LABELS]:
    "Mailbox organization — no recipient observes it",
  [COMPOSIO_TOOL_SLUGS.GMAIL_MODIFY_THREAD_LABELS]:
    "Mailbox organization — no recipient observes it",
  [COMPOSIO_TOOL_SLUGS.GMAIL_CREATE_LABEL]:
    "Mailbox organization — no recipient observes it",
  [COMPOSIO_TOOL_SLUGS.GMAIL_MOVE_TO_TRASH]:
    "Mailbox housekeeping in the user's own account",
  [COMPOSIO_TOOL_SLUGS.OUTLOOK_BATCH_MOVE_MESSAGES]:
    "Mailbox housekeeping in the user's own account",
};

/**
 * Tools that must always bill even if their slug or risk suggests otherwise.
 * Drafts belong here: §1 lists "invoice drafted to a third party" as billable,
 * and a draft written into Gmail or Stripe is real work performed in an
 * external system.
 */
const EXTERNAL_OVERRIDES: Record<string, string> = {
  [COMPOSIO_TOOL_SLUGS.GMAIL_CREATE_DRAFT]:
    "Draft written into the external mailbox — §1 counts drafted output",
  [COMPOSIO_TOOL_SLUGS.OUTLOOK_CREATE_DRAFT]:
    "Draft written into the external mailbox — §1 counts drafted output",
};

/**
 * Classify without touching the database.
 *
 * Read tools pull context in and never produce an effect. Every other Composio
 * tool acts on a third-party system by definition, so mutating and destructive
 * default to external. The failure direction is toward not billing.
 */
export function classifyExternalEffectByHeuristic(
  toolSlug: string,
  risk?: ToolRiskClass,
): ExternalEffectClassification {
  const slug = toolSlug.toUpperCase();

  const nonExternalReason = NON_EXTERNAL_OVERRIDES[slug];
  if (nonExternalReason) {
    return { externalEffect: false, source: "override", reason: nonExternalReason };
  }

  const externalReason = EXTERNAL_OVERRIDES[slug];
  if (externalReason) {
    return { externalEffect: true, source: "override", reason: externalReason };
  }

  const resolvedRisk = risk ?? classifyToolByHeuristic(slug).risk;
  if (resolvedRisk === "read") {
    return {
      externalEffect: false,
      source: "risk",
      reason: "Read tools gather context and leave no external effect",
    };
  }

  return {
    externalEffect: true,
    source: "risk",
    reason: `${resolvedRisk} Composio tool acts on a third-party system`,
  };
}

interface CacheEntry {
  classification: ExternalEffectClassification;
  expiresAt: number;
}

const CACHE_TTL_MS = 60_000;
const cache = new Map<string, CacheEntry>();

export function invalidateExternalEffectCache(toolSlug?: string): void {
  if (toolSlug) {
    cache.delete(toolSlug);
  } else {
    cache.clear();
  }
}

/**
 * Resolve external effect for a tool slug.
 *
 * Resolution order: explicit `tool_classifications.external_effect`, then the
 * heuristic above seeded with the stored risk, then the slug heuristic alone.
 * A database error falls back to the heuristic rather than throwing — metering
 * degrades to a best estimate instead of failing a play that already ran.
 */
export async function resolveToolExternalEffect(
  toolSlug: string,
): Promise<ExternalEffectClassification> {
  const cached = cache.get(toolSlug);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.classification;
  }

  let classification: ExternalEffectClassification | null = null;

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("tool_classifications")
      .select("risk, external_effect")
      .eq("tool_slug", toolSlug)
      .maybeSingle();

    if (error) {
      console.error(
        `[external-effect] DB lookup failed for ${toolSlug} — falling back to heuristic:`,
        error.message,
      );
    } else if (data && typeof data.external_effect === "boolean") {
      classification = {
        externalEffect: data.external_effect,
        source: "database",
        reason: "Explicit classification in tool_classifications",
      };
    } else if (data?.risk) {
      classification = classifyExternalEffectByHeuristic(
        toolSlug,
        data.risk as ToolRiskClass,
      );
    }
  } catch (error) {
    console.error(
      `[external-effect] lookup threw for ${toolSlug} — falling back to heuristic:`,
      error,
    );
  }

  classification ??= classifyExternalEffectByHeuristic(toolSlug);

  cache.set(toolSlug, { classification, expiresAt: Date.now() + CACHE_TTL_MS });
  return classification;
}

/**
 * Billability for a whole play: true when any executed tool left Salt.
 *
 * Hybrid plays (internal steps plus one external send) are billable exactly
 * once — the caller records a single `play_executed` event either way.
 */
export async function anyToolHasExternalEffect(
  toolSlugs: readonly string[],
): Promise<boolean> {
  if (toolSlugs.length === 0) return false;

  const unique = [...new Set(toolSlugs)];
  const results = await Promise.all(unique.map(resolveToolExternalEffect));
  return results.some((result) => result.externalEffect);
}
