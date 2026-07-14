import "server-only";

import { createAdminClient } from "@/app/_lib/supabase/admin";
import type { ComposioToolPolicy } from "./tool-policy-registry";
import { classifyToolByHeuristic } from "./tool-classification-heuristics";

/**
 * Tool classification lookup with heuristic fallback (scalable-connectors Phase 1).
 *
 * Resolution order:
 * 1. DB classification (tool_classifications) with status 'approved'
 * 2. Heuristic classification (pattern matching on slug)
 *
 * This enables new Composio tools immediately without manual review. The
 * heuristics classify by slug pattern (GET_* = read, DELETE_* = destructive,
 * CREATE_* = mutating). Manual overrides in the DB take precedence.
 *
 * Policy ENFORCEMENT (trust ladder, unattended read-only, destructive
 * never-execute) stays in tool-policy.ts; only the risk DATA is resolved here.
 */

interface CacheEntry {
  policy: ComposioToolPolicy | null;
  expiresAt: number;
}

/** Classifications change rarely (review-queue approvals, drift disables). */
const CACHE_TTL_MS = 60_000;
/** Negative results cache briefly so a missing slug can't hammer the DB. */
const NEGATIVE_CACHE_TTL_MS = 15_000;

const cache = new Map<string, CacheEntry>();

/** Test hook + review-queue actions call this after writing classifications. */
export function invalidateClassificationCache(toolSlug?: string): void {
  if (toolSlug) {
    cache.delete(toolSlug);
  } else {
    cache.clear();
  }
}

/**
 * Resolve the classification for a tool slug.
 *
 * Resolution order:
 * 1. DB classification (approved status)
 * 2. Heuristic fallback (pattern matching)
 *
 * DB errors fall back to heuristics rather than blocking — the heuristics
 * are safe defaults (conservative classification with confirmation required).
 */
export async function getApprovedToolClassification(
  toolSlug: string,
): Promise<ComposioToolPolicy | null> {
  const cached = cache.get(toolSlug);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.policy;
  }

  let policy: ComposioToolPolicy | null = null;
  let usedHeuristic = false;

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("tool_classifications")
      .select("tool_slug, risk, requires_human_confirmation, status")
      .eq("tool_slug", toolSlug)
      .maybeSingle();

    if (error) {
      console.error(
        `[classification-store] DB lookup failed for ${toolSlug} — falling back to heuristics:`,
        error.message,
      );
      // Fall through to heuristic fallback
    } else if (data && data.status === "approved" && data.risk) {
      // DB classification takes precedence
      policy = {
        slug: data.tool_slug,
        risk: data.risk,
        requiresHumanConfirmation: data.requires_human_confirmation,
      };
    }
  } catch (error) {
    console.error(
      `[classification-store] lookup threw for ${toolSlug} — falling back to heuristics:`,
      error,
    );
    // Fall through to heuristic fallback
  }

  // Heuristic fallback: classify by slug pattern
  if (!policy) {
    const heuristic = classifyToolByHeuristic(toolSlug);
    policy = {
      slug: toolSlug,
      risk: heuristic.risk,
      requiresHumanConfirmation: heuristic.requiresHumanConfirmation,
    };
    usedHeuristic = true;
  }

  cache.set(toolSlug, {
    policy,
    expiresAt:
      Date.now() + (usedHeuristic ? NEGATIVE_CACHE_TTL_MS : CACHE_TTL_MS),
  });
  return policy;
}
