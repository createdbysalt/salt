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
import { findPersonIdsByEmail } from "@/app/_features/memory/records/person-emails";
import {
  matchWatchExpressions,
  updateWatchMatchTimestamp,
} from "../watch-expressions";
import { queueReenrichment } from "../reenrichment-bridge";
import type { KnownEntityGateInput, GateResultSignal } from "../../types/gate-result";

export async function runKnownEntityGate(
  input: KnownEntityGateInput
): Promise<GateResultSignal | null> {
  const { workspaceId, senderEmail, senderDomain } = input;

  if (!senderEmail && !senderDomain) {
    return null;
  }

  const watchMatches = await matchWatchExpressions(workspaceId, {
    emails: senderEmail ? [senderEmail] : undefined,
    domains: senderDomain ? [senderDomain] : undefined,
  });

  if (watchMatches.length > 0) {
    const match = watchMatches[0];

    // Known-entity watch — update timestamp and queue re-enrichment
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
    // Resolve by any known address (person_emails identity set + primary).
    const matchedIds = await findPersonIdsByEmail(admin, workspaceId, emailLower);
    const { data: personByEmail } = matchedIds.length
      ? await admin
          .from("people")
          .select("id, name, email")
          .eq("workspace_id", workspaceId)
          .in("id", matchedIds)
          .limit(1)
          .maybeSingle()
      : { data: null };

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
        reason: `Email matches known person: ${personByEmail.name ?? emailLower}`,
      };
    }

    const { data: personByBillingEmail } = await admin
      .from("people")
      .select("id, name, billing_email")
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
        reason: `Billing email matches known person: ${personByBillingEmail.name ?? emailLower}`,
      };
    }
  }

  if (senderDomain) {
    const domainLower = senderDomain.toLowerCase();

    const { data: orgByDomain } = await admin
      .from("organizations")
      .select("id, name, domain")
      .eq("workspace_id", workspaceId)
      .ilike("domain", domainLower)
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
        reason: `Domain matches known organization: ${orgByDomain.name ?? domainLower}`,
      };
    }
  }

  return null;
}
