import "server-only";

import { createAdminClient } from "@/app/_lib/supabase/admin";
import type { ComposioToolPolicy } from "./tool-policy-registry";

/**
 * Fail-closed tool classification lookup (connector-platform Phase 2.4).
 *
 * The execution gate resolves every tool's risk class from
 * `tool_classifications`. Only rows with status 'approved' (and a risk
 * verdict) yield a policy; unclassified / proposed / rejected / disabled
 * rows and DB errors all resolve to null — and null means the gate blocks.
 * Policy ENFORCEMENT (trust ladder, unattended read-only, destructive
 * never-execute) stays in code; only the risk DATA lives in the DB.
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
 * Resolve the approved classification for a tool slug, or null (blocked).
 * Errors resolve to null: the gate fails closed, never open.
 */
export async function getApprovedToolClassification(
  toolSlug: string,
): Promise<ComposioToolPolicy | null> {
  const cached = cache.get(toolSlug);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.policy;
  }

  let policy: ComposioToolPolicy | null = null;
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("tool_classifications")
      .select("tool_slug, risk, requires_human_confirmation, status")
      .eq("tool_slug", toolSlug)
      .maybeSingle();

    if (error) {
      console.error(
        `[classification-store] lookup failed for ${toolSlug} — failing closed:`,
        error.message,
      );
    } else if (data && data.status === "approved" && data.risk) {
      policy = {
        slug: data.tool_slug,
        risk: data.risk,
        requiresHumanConfirmation: data.requires_human_confirmation,
      };
    }
  } catch (error) {
    console.error(
      `[classification-store] lookup threw for ${toolSlug} — failing closed:`,
      error,
    );
  }

  cache.set(toolSlug, {
    policy,
    expiresAt: Date.now() + (policy ? CACHE_TTL_MS : NEGATIVE_CACHE_TTL_MS),
  });
  return policy;
}
