import "server-only";

/**
 * Blocklist Manager — facade over the connector rules primitive.
 *
 * Captures V2 shipped a workspace blocklist (capture_blocklist). Connector
 * Rules & Learning (Phase 2) generalizes that into `connector_rules`
 * (allow/deny, provider-scoped or workspace-wide). This module keeps the
 * blocklist API stable for existing callers (actions, gates) while every
 * read/write lands in connector_rules as workspace-wide deny rules.
 *
 * Vocabulary mapping: domain → domain, email → sender_email,
 * sender_pattern → sender_pattern.
 *
 * Security invariants preserved from the blocklist era:
 * - Exact type+value parameterized .eq() lookups — never string-built
 *   .or() filter expressions (PostgREST filter injection).
 * - Attacker-controlled sender identifiers that fail shape validation
 *   fail CLOSED; infrastructure errors fail OPEN (a rules outage must not
 *   drop all inbound capture).
 * - sender_pattern rows only ever match sender display names — never
 *   exact domain/email values.
 */

import {
  getRules,
  addRule,
  removeRule,
  checkRules,
  type ConnectorRule,
} from "./rules-manager";
import type { ConnectorRuleEntityType } from "../adapters/types";

export type BlocklistType = "domain" | "email" | "sender_pattern";

export interface BlocklistEntry {
  id: string;
  workspaceId: string;
  type: BlocklistType;
  value: string;
  reason: string | null;
  createdAt: string;
  createdBy: string | null;
}

export interface AddBlocklistEntryInput {
  workspaceId: string;
  type: BlocklistType;
  value: string;
  reason?: string;
  createdBy?: string;
}

export interface BlocklistStats {
  totalEntries: number;
  byType: Record<BlocklistType, number>;
  recentlyAdded: BlocklistEntry[];
}

const BLOCKLIST_TO_ENTITY_TYPE: Record<
  BlocklistType,
  ConnectorRuleEntityType
> = {
  domain: "domain",
  email: "sender_email",
  sender_pattern: "sender_pattern",
};

const ENTITY_TO_BLOCKLIST_TYPE: Partial<
  Record<ConnectorRuleEntityType, BlocklistType>
> = {
  domain: "domain",
  sender_email: "email",
  sender_pattern: "sender_pattern",
};

function mapRuleToEntry(rule: ConnectorRule): BlocklistEntry | null {
  const type = ENTITY_TO_BLOCKLIST_TYPE[rule.entityType];
  if (!type) return null;
  return {
    id: rule.id,
    workspaceId: rule.workspaceId,
    type,
    value: rule.entityKey,
    reason: rule.reason,
    createdAt: rule.createdAt,
    createdBy: rule.createdBy,
  };
}

/**
 * Get all blocklist entries for a workspace (workspace-wide deny rules).
 */
export async function getBlocklistEntries(
  workspaceId: string,
  options: { type?: BlocklistType; limit?: number } = {},
): Promise<BlocklistEntry[]> {
  const { type, limit = 100 } = options;

  const rules = await getRules(workspaceId, {
    provider: null,
    ruleType: "deny",
    entityType: type ? BLOCKLIST_TO_ENTITY_TYPE[type] : undefined,
    limit,
  });

  return rules
    .map(mapRuleToEntry)
    .filter((entry): entry is BlocklistEntry => entry !== null);
}

/**
 * Add a new blocklist entry.
 */
export async function addBlocklistEntry(
  input: AddBlocklistEntryInput,
): Promise<{ success: boolean; entry?: BlocklistEntry; error?: string }> {
  const { workspaceId, type, value, reason, createdBy } = input;

  const result = await addRule({
    workspaceId,
    provider: null,
    ruleType: "deny",
    entityType: BLOCKLIST_TO_ENTITY_TYPE[type],
    entityKey: value,
    reason,
    createdBy,
  });

  if (!result.success || !result.rule) {
    return {
      success: false,
      error: result.error?.replace(/^Rule already exists$/, "Entry already exists"),
    };
  }

  const entry = mapRuleToEntry(result.rule);
  if (!entry) {
    return { success: false, error: "Unexpected rule shape" };
  }
  return { success: true, entry };
}

/**
 * Remove a blocklist entry.
 */
export async function removeBlocklistEntry(
  workspaceId: string,
  entryId: string,
): Promise<{ success: boolean; error?: string }> {
  return removeRule(workspaceId, entryId);
}

/**
 * Get blocklist statistics for a workspace.
 */
export async function getBlocklistStats(
  workspaceId: string,
): Promise<BlocklistStats> {
  const empty: BlocklistStats = {
    totalEntries: 0,
    byType: { domain: 0, email: 0, sender_pattern: 0 },
    recentlyAdded: [],
  };

  const rules = await getRules(workspaceId, {
    provider: null,
    ruleType: "deny",
    limit: 1000,
  });

  const entries = rules
    .map(mapRuleToEntry)
    .filter((entry): entry is BlocklistEntry => entry !== null);

  const byType: Record<BlocklistType, number> = {
    domain: 0,
    email: 0,
    sender_pattern: 0,
  };
  for (const entry of entries) {
    byType[entry.type]++;
  }

  // Rules arrive created_at-desc, so the first five are the most recent.
  return { ...empty, totalEntries: entries.length, byType, recentlyAdded: entries.slice(0, 5) };
}

// Sender identifiers are attacker-controlled (they arrive on inbound mail).
// They must never reach a PostgREST filter-expression string, and values
// containing filter metacharacters (`,`, `(`, `)`, quotes, whitespace) are
// treated as hostile and fail closed.
const SAFE_DOMAIN_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N}._-]*$/u;
const SAFE_EMAIL_PATTERN = /^[^\s,()"'@]+@[\p{L}\p{N}][\p{L}\p{N}._-]*$/u;

/**
 * Check if a value is blocked by the workspace blocklist.
 *
 * Evaluation order preserves blocklist-era semantics: exact domain, exact
 * email (plus its derived domain), then sender-name glob patterns.
 */
export async function isBlocked(
  workspaceId: string,
  checks: {
    domain?: string;
    email?: string;
    senderName?: string;
  },
): Promise<{
  blocked: boolean;
  reason?: string;
  matchedEntry?: BlocklistEntry;
}> {
  try {
    if (checks.domain) {
      const domain = checks.domain.trim().toLowerCase();
      if (!SAFE_DOMAIN_PATTERN.test(domain)) {
        return {
          blocked: true,
          reason: "Sender identifiers failed validation",
        };
      }

      const domainCheck = await checkRules(workspaceId, {
        provider: null,
        entity: { type: "domain", key: domain },
      });
      if (domainCheck.verdict === "deny" && domainCheck.rule) {
        return toBlockedResult(domainCheck.rule);
      }
    }

    if (checks.email) {
      const email = checks.email.trim().toLowerCase();
      if (!SAFE_EMAIL_PATTERN.test(email)) {
        return {
          blocked: true,
          reason: "Sender identifiers failed validation",
        };
      }

      const emailCheck = await checkRules(workspaceId, {
        provider: null,
        entity: { type: "sender_email", key: email },
      });
      if (emailCheck.verdict === "deny" && emailCheck.rule) {
        return toBlockedResult(emailCheck.rule);
      }
    }

    if (checks.senderName) {
      const patternCheck = await checkRules(workspaceId, {
        provider: null,
        entity: null,
        patternCandidates: [checks.senderName],
      });
      if (patternCheck.verdict === "deny" && patternCheck.rule) {
        const rule = patternCheck.rule;
        const entry = mapRuleToEntry(rule);
        return {
          blocked: true,
          reason: rule.reason ?? `Matched sender pattern: ${rule.entityKey}`,
          matchedEntry: entry ?? undefined,
        };
      }
    }

    return { blocked: false };
  } catch {
    // Fail open on unexpected errors — same bargain as the infra-error path.
    return { blocked: false };
  }
}

function toBlockedResult(rule: ConnectorRule): {
  blocked: boolean;
  reason: string;
  matchedEntry?: BlocklistEntry;
} {
  const entry = mapRuleToEntry(rule);
  return {
    blocked: true,
    reason:
      rule.reason ??
      `Blocked by ${ENTITY_TO_BLOCKLIST_TYPE[rule.entityType] ?? rule.entityType} blocklist`,
    matchedEntry: entry ?? undefined,
  };
}
