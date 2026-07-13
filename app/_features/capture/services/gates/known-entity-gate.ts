import "server-only";

/**
 * Known-Entity Gate (Captures V2 Phase 2 — Gate 2).
 *
 * Fast-tracks captures from known contacts:
 * - Watch expressions (Phase 3) — fastest path, indexed lookup
 * - Email matches a Person in Memory
 * - Domain matches an Organization in Memory
 *
 * If matched, the capture routes directly to that entity with high confidence.
 * This gate requires DB lookups but is still fast (indexed queries).
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { matchWatchExpressions, updateWatchMatchTimestamp } from "../watch-expressions";
import { queueReenrichment } from "../reenrichment-bridge";
import type { KnownEntityGateInput, GateResultSignal } from "../../types/gate-result";

export async function runKnownEntityGate(
  input: KnownEntityGateInput
): Promise<GateResultSignal | null> {
  const { workspaceId, senderEmail, senderDomain, senderName } = input;

  if (!senderEmail && !senderDomain) {
    return null;
  }

  const watchMatches = await matchWatchExpressions(workspaceId, {
    emails: senderEmail ? [senderEmail] : undefined,
    domains: senderDomain ? [senderDomain] : undefined,
  });

  if (watchMatches.length > 0) {
    const match = watchMatches[0];

    // Update timestamp and queue re-enrichment (non-blocking)
    updateWatchMatchTimestamp(match.expression.id).catch(() => {});
    queueReenrichment(workspaceId, match);

    return {
      action: "signal",
      gate: "known-entity",
      target: {
        surface: match.expression.targetSurface,
        entityId: match.expression.targetEntityId,
        matchType: match.expression.expressionType === "email" ? "email" : "domain",
        confidence: match.expression.expressionType === "email" ? 95 : 85,
      },
      reason: `Watch expression match: ${match.expression.expressionType} = ${match.matchedValue}`,
    };
  }

  const admin = createAdminClient();

  if (senderEmail) {
    const emailLower = senderEmail.toLowerCase();
    const { data: personByEmail } = await admin
      .from("people")
      .select("id, display_name, emails")
      .eq("workspace_id", workspaceId)
      .contains("emails", [emailLower])
      .limit(1)
      .maybeSingle();

    if (personByEmail) {
      return {
        action: "signal",
        gate: "known-entity",
        target: {
          surface: "people",
          entityId: personByEmail.id,
          matchType: "email",
          confidence: 95,
        },
        reason: `Email matches known person: ${personByEmail.display_name ?? emailLower}`,
      };
    }

    const { data: personByBillingEmail } = await admin
      .from("people")
      .select("id, display_name, billing_email")
      .eq("workspace_id", workspaceId)
      .ilike("billing_email", emailLower)
      .limit(1)
      .maybeSingle();

    if (personByBillingEmail) {
      return {
        action: "signal",
        gate: "known-entity",
        target: {
          surface: "people",
          entityId: personByBillingEmail.id,
          matchType: "email",
          confidence: 90,
        },
        reason: `Billing email matches known person: ${personByBillingEmail.display_name ?? emailLower}`,
      };
    }
  }

  if (senderDomain) {
    const domainLower = senderDomain.toLowerCase();

    const { data: orgByDomain } = await admin
      .from("organizations")
      .select("id, display_name, domains")
      .eq("workspace_id", workspaceId)
      .contains("domains", [domainLower])
      .limit(1)
      .maybeSingle();

    if (orgByDomain) {
      return {
        action: "signal",
        gate: "known-entity",
        target: {
          surface: "organizations",
          entityId: orgByDomain.id,
          matchType: "domain",
          confidence: 85,
        },
        reason: `Domain matches known organization: ${orgByDomain.display_name ?? domainLower}`,
      };
    }

    const { data: orgByPrimaryDomain } = await admin
      .from("organizations")
      .select("id, display_name, domain")
      .eq("workspace_id", workspaceId)
      .ilike("domain", domainLower)
      .limit(1)
      .maybeSingle();

    if (orgByPrimaryDomain) {
      return {
        action: "signal",
        gate: "known-entity",
        target: {
          surface: "organizations",
          entityId: orgByPrimaryDomain.id,
          matchType: "domain",
          confidence: 85,
        },
        reason: `Primary domain matches known organization: ${orgByPrimaryDomain.display_name ?? domainLower}`,
      };
    }
  }

  return null;
}

/**
 * Check if we've had prior interaction with this sender.
 * Future: This will use watch expressions table.
 */
export async function checkPriorInteraction(
  workspaceId: string,
  senderEmail: string
): Promise<{ hasPriorInteraction: boolean; interactionType?: string }> {
  const admin = createAdminClient();
  const emailLower = senderEmail.toLowerCase();

  const { data: existingCapture } = await admin
    .from("capture_events")
    .select("id, source_type")
    .eq("workspace_id", workspaceId)
    .contains("extracted_data", { sender_email: emailLower })
    .limit(1)
    .maybeSingle();

  if (existingCapture) {
    return {
      hasPriorInteraction: true,
      interactionType: `Prior ${existingCapture.source_type} capture`,
    };
  }

  return { hasPriorInteraction: false };
}
