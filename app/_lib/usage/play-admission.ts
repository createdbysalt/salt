import "server-only";

import { anyToolHasExternalEffect } from "@/app/_lib/composio/external-effect";
import { getWorkspaceEntitlement } from "./entitlements";
import type { WorkspaceEntitlement } from "./types";

/**
 * Play-bundle admission (pricing §1 enforcement).
 *
 * `canSpend` caps what a workspace *costs*; this caps what it *consumes* —
 * the revenue-side gate the cost-side circuit breaker cannot be. Nothing else
 * checked `playsRemaining` before a play ran, so a Starter workspace could
 * execute unlimited billable plays (just not at unlimited cost to us).
 *
 * Only plays that *could* bill are gated. Billability derives from
 * `external_effect`, never from a per-play judgement: a play whose act steps
 * are all internal (mailbox housekeeping) or that has no acting steps at all
 * is allowed without an entitlement read, because it can never consume the
 * bundle. Capability act steps are gated on potential — their concrete slug
 * resolves at runtime, and every acting capability (send_message,
 * create_invoice, …) exists to leave Salt.
 *
 * Fails open, for the same reason `canSpend` does: an unreadable entitlement
 * must not block customer work. The execution is still metered on the way
 * out, so a gate that waved a play through leaves a ledger row the
 * reconciliation sweep can see.
 */

export interface PlayAdmissionCandidate {
  /**
   * Concrete act-step tool slugs, with Salt-internal slugs (memory_*)
   * excluded by the caller. Fetch-step slugs never bill and do not belong
   * here.
   */
  toolSlugs: readonly string[];
  /** True when any act step declares an external-effect capability. */
  hasExternalCapabilityStep: boolean;
}

export type PlayAdmissionDecision =
  | { allowed: true; reason: string }
  | {
      allowed: false;
      reason: string;
      /** Copy safe to show the customer. */
      userMessage: string;
      entitlement: WorkspaceEntitlement;
    };

function exhaustedMessage(entitlement: WorkspaceEntitlement): string {
  return (
    `This workspace has used all ${entitlement.playsIncluded} plays in its ` +
    "bundle for the current billing period. Enable overage or upgrade in " +
    "Billing, then re-approve this play."
  );
}

export async function checkPlayAdmission(
  workspaceId: string,
  candidate: PlayAdmissionCandidate,
): Promise<PlayAdmissionDecision> {
  try {
    if (candidate.toolSlugs.length === 0 && !candidate.hasExternalCapabilityStep) {
      return { allowed: true, reason: "no acting steps — cannot bill" };
    }

    const potentiallyBillable =
      candidate.hasExternalCapabilityStep ||
      (await anyToolHasExternalEffect(candidate.toolSlugs));

    if (!potentiallyBillable) {
      return { allowed: true, reason: "no external effect — never billed" };
    }

    const entitlement = await getWorkspaceEntitlement(workspaceId);

    if (entitlement.overageEnabled) {
      return {
        allowed: true,
        reason: "bundle exhausted but overage is enabled — play bills as overage",
      };
    }

    if (entitlement.playsRemaining > 0) {
      return {
        allowed: true,
        reason: `${entitlement.playsRemaining} of ${entitlement.playsIncluded} plays remain`,
      };
    }

    // Loud on purpose, same as canSpend's deny: blocking a paying customer is
    // the most consequential thing this module does and must leave a trace.
    console.warn(
      "[usage] play admission denied for workspace",
      workspaceId,
      `— ${entitlement.playsUsed}/${entitlement.playsIncluded} plays used, overage off`,
    );

    return {
      allowed: false,
      reason: `bundle exhausted (${entitlement.playsUsed}/${entitlement.playsIncluded}) and overage disabled`,
      userMessage: exhaustedMessage(entitlement),
      entitlement,
    };
  } catch (error) {
    console.error(
      "[usage] play admission check threw for workspace",
      workspaceId,
      "— allowing:",
      error,
    );
    return { allowed: true, reason: "admission check threw — failing open" };
  }
}
