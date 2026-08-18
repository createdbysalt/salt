import "server-only";

/**
 * Rules Manager (Connector Rules & Learning, Phase 2).
 *
 * The single service over `connector_rules` — allow/deny intake rules in
 * three scopes (2026-08-17): provider-scoped (provider set), area-scoped
 * (provider NULL + area set — covers every account in the area, including
 * accounts connected later), and workspace-wide (both NULL).
 *
 * Semantics:
 * - Gate precedence is explicit deny > explicit allow > heuristics; this
 *   service returns deny first, then allow, then null (no opinion).
 * - Scope precedence for the same entity: provider > area > workspace.
 * - Entity matching is category-agnostic (entity_type + entity_key); for
 *   email senders the domain rule is derived from the sender_email key at
 *   check time, and sender_pattern globs match against `patternCandidates`
 *   (e.g. the display name) — the legacy blocklist semantics, generalized.
 *
 * Storage rule: workspace-learned state never lands in connector_overrides
 * (global Salt catalog) — connector_rules is workspace-keyed.
 *
 * All lookups are parameterized .eq() filters — never string-built .or()
 * expressions (PostgREST filter injection).
 */

import {
  isValidSenderGlobPattern,
  matchesSenderGlobPattern,
} from "@repo/security";
import { createAdminClient } from "@/app/_lib/supabase/admin";
import type { ConnectorRuleEntityType } from "../adapters/types";

export type ConnectorRuleType = "allow" | "deny";
export type ConnectorRuleSource = "user" | "suggested" | "correction" | "ask_salt";

export interface ConnectorRule {
  id: string;
  workspaceId: string;
  /** NULL = not provider-scoped. */
  provider: string | null;
  /** NULL = not area-scoped. provider NULL + area set = the area scope. */
  area: string | null;
  ruleType: ConnectorRuleType;
  entityType: ConnectorRuleEntityType;
  entityKey: string;
  reason: string | null;
  source: ConnectorRuleSource;
  createdBy: string | null;
  createdAt: string;
}

export interface AddRuleInput {
  workspaceId: string;
  /** Provider scope. Mutually exclusive with area. */
  provider?: string | null;
  /** Area scope (email, calendar, …) — requires provider null. */
  area?: string | null;
  ruleType: ConnectorRuleType;
  entityType: ConnectorRuleEntityType;
  entityKey: string;
  reason?: string;
  source?: ConnectorRuleSource;
  createdBy?: string;
}

export interface RuleCheckInput {
  /** The connection's provider; null checks workspace-wide rules only. */
  provider: string | null;
  /** The connection's intake area — area-scoped rules join the check. */
  area?: string | null;
  /**
   * The entity under check (from the category adapter's extraction). May be
   * null when there is no entity — e.g. a sender-NAME-only blocklist check —
   * in which case only glob (sender_pattern) rules are evaluated against
   * patternCandidates.
   */
  entity: { type: ConnectorRuleEntityType; key: string } | null;
  /**
   * Strings that glob rules (sender_pattern) may match — e.g. the sender
   * display name for email. The entity key is deliberately NOT a glob
   * target: sender_pattern is a name-pattern vocabulary, and globbing the
   * key would let a pattern row cross-match exact domain/email lookups.
   */
  patternCandidates?: string[];
  /**
   * Per-entity-type match candidates (S5 vocabulary expansion) — e.g.
   * `{ subject_pattern: ["Invoice #42"], attendee: ["bob@acme.com"] }`.
   * Pattern types glob against their candidates; people types (attendee,
   * participant) exact-match case-insensitively.
   */
  entityCandidates?: Partial<Record<ConnectorRuleEntityType, string[]>>;
}

export interface RuleCheckResult {
  verdict: "deny" | "allow" | null;
  rule?: ConnectorRule;
}

/** Past 100 rows a flat limit silently stops enforcing — page instead. */
const PAGE_SIZE = 100;

/**
 * Glob-pattern entity types (S5): the key is a glob validated at write time
 * and matched against per-capture candidate strings at check time.
 * sender_pattern matches `patternCandidates` (legacy blocklist semantics);
 * the rest match `entityCandidates[type]`.
 */
const GLOB_PATTERN_ENTITY_TYPES: ReadonlySet<ConnectorRuleEntityType> =
  new Set([
    "sender_pattern",
    "subject_pattern",
    "title_pattern",
    "keyword",
    "name_pattern",
  ]);

/** Email-like keys normalize to lowercase; ids (channel, project) stay verbatim. */
const LOWERCASE_ENTITY_TYPES: ReadonlySet<ConnectorRuleEntityType> = new Set([
  "sender_email",
  "domain",
  "contact",
  "organizer",
  "customer",
  "owner",
  "assignee",
  "host",
  "attendee",
  "participant",
]);

export function normalizeRuleEntityKey(
  entityType: ConnectorRuleEntityType,
  key: string,
): string | null {
  const trimmed = key.trim();
  if (!trimmed) return null;

  if (GLOB_PATTERN_ENTITY_TYPES.has(entityType)) {
    return isValidSenderGlobPattern(trimmed) ? trimmed : null;
  }
  if (entityType === "domain") {
    return trimmed.toLowerCase().replace(/^@/, "");
  }
  if (LOWERCASE_ENTITY_TYPES.has(entityType)) {
    return trimmed.toLowerCase();
  }
  return trimmed;
}

function extractDomain(key: string): string | null {
  const at = key.lastIndexOf("@");
  if (at < 0 || at === key.length - 1) return null;
  return key.slice(at + 1);
}

function mapRule(row: Record<string, unknown>): ConnectorRule {
  return {
    id: row.id as string,
    workspaceId: row.workspace_id as string,
    provider: (row.provider as string | null) ?? null,
    area: (row.area as string | null) ?? null,
    ruleType: row.rule_type as ConnectorRuleType,
    entityType: row.entity_type as ConnectorRuleEntityType,
    entityKey: row.entity_key as string,
    reason: (row.reason as string | null) ?? null,
    source: (row.source as ConnectorRuleSource | null) ?? "user",
    createdBy: (row.created_by as string | null) ?? null,
    createdAt: row.created_at as string,
  };
}

/**
 * Load one exact scope's rules, paginated past the 100-row boundary in
 * stable id order so pages never skip under inserts.
 */
async function loadScopeRules(
  workspaceId: string,
  scope: { provider: string | null; area: string | null },
): Promise<{ rules: ConnectorRule[]; error: boolean }> {
  const admin = createAdminClient();
  const collected: ConnectorRule[] = [];

  for (let offset = 0; ; offset += PAGE_SIZE) {
    let query = admin
      .from("connector_rules")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("id")
      .range(offset, offset + PAGE_SIZE - 1);

    query = scope.provider
      ? query.eq("provider", scope.provider)
      : query.is("provider", null);
    query = scope.area ? query.eq("area", scope.area) : query.is("area", null);

    const { data, error } = await query;
    if (error) {
      // Fail open on infra errors: a rules outage must not drop ALL inbound
      // capture. Hostile input never reaches this path — keys are validated
      // at write time and checks use parameterized filters.
      console.error("[rules-manager] loadScopeRules error:", error);
      return { rules: collected, error: true };
    }

    const page = (data ?? []).map(mapRule);
    collected.push(...page);

    if (!data || data.length < PAGE_SIZE) break;
  }

  return { rules: collected, error: false };
}

/**
 * Load every rule relevant to a check scope: the provider's own rows, the
 * area's rows (provider NULL + area), and workspace-wide rows (both NULL).
 */
async function loadScopedRules(
  workspaceId: string,
  provider: string | null,
  area: string | null,
): Promise<{ rules: ConnectorRule[]; error: boolean }> {
  const scopes: { provider: string | null; area: string | null }[] = [];
  if (provider) scopes.push({ provider, area: null });
  if (area) scopes.push({ provider: null, area });
  scopes.push({ provider: null, area: null });

  const rules: ConnectorRule[] = [];
  let error = false;
  for (const scope of scopes) {
    const result = await loadScopeRules(workspaceId, scope);
    rules.push(...result.rules);
    error = error || result.error;
  }
  return { rules, error };
}

/**
 * List rules for a workspace. Defaults to all scopes; pass `provider` to
 * scope to one connection, `ruleType`/`entityType` to narrow further.
 */
export async function getRules(
  workspaceId: string,
  options: {
    provider?: string | null;
    area?: string | null;
    ruleType?: ConnectorRuleType;
    entityType?: ConnectorRuleEntityType;
    limit?: number;
  } = {},
): Promise<ConnectorRule[]> {
  const { provider, area, ruleType, entityType, limit = 100 } = options;
  const admin = createAdminClient();

  let query = admin
    .from("connector_rules")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (provider !== undefined) {
    query = provider === null ? query.is("provider", null) : query.eq("provider", provider);
  }
  if (area !== undefined) {
    query = area === null ? query.is("area", null) : query.eq("area", area);
  }
  if (ruleType) query = query.eq("rule_type", ruleType);
  if (entityType) query = query.eq("entity_type", entityType);

  const { data, error } = await query;

  if (error) {
    console.error("[rules-manager] getRules error:", error);
    return [];
  }

  return (data ?? []).map(mapRule);
}

/**
 * Add a rule. Duplicate (workspace, provider, area, rule_type, entity) is
 * rejected pre-insert so callers get a readable error, not a 23505.
 * provider and area are mutually exclusive — a rule has exactly one scope.
 */
export async function addRule(
  input: AddRuleInput,
): Promise<{ success: boolean; rule?: ConnectorRule; error?: string }> {
  const provider = input.provider ?? null;
  const area = input.area ?? null;
  if (provider !== null && area !== null) {
    return { success: false, error: "A rule is scoped to a provider or an area, not both" };
  }
  const entityKey = normalizeRuleEntityKey(input.entityType, input.entityKey);
  if (!entityKey) {
    return { success: false, error: "Invalid value format" };
  }

  const admin = createAdminClient();

  let existingQuery = admin
    .from("connector_rules")
    .select("id")
    .eq("workspace_id", input.workspaceId)
    .eq("rule_type", input.ruleType)
    .eq("entity_type", input.entityType)
    .eq("entity_key", entityKey);

  existingQuery = provider
    ? existingQuery.eq("provider", provider)
    : existingQuery.is("provider", null);
  existingQuery = area
    ? existingQuery.eq("area", area)
    : existingQuery.is("area", null);

  const { data: existing } = await existingQuery.maybeSingle();

  if (existing) {
    return { success: false, error: "Rule already exists" };
  }

  const { data, error } = await admin
    .from("connector_rules")
    .insert({
      workspace_id: input.workspaceId,
      provider,
      area,
      rule_type: input.ruleType,
      entity_type: input.entityType,
      entity_key: entityKey,
      reason: input.reason ?? null,
      source: input.source ?? "user",
      created_by: input.createdBy ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error("[rules-manager] addRule error:", error);
    return { success: false, error: error.message };
  }

  return { success: true, rule: mapRule(data) };
}

export async function removeRule(
  workspaceId: string,
  ruleId: string,
): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient();

  const { error } = await admin
    .from("connector_rules")
    .delete()
    .eq("id", ruleId)
    .eq("workspace_id", workspaceId);

  if (error) {
    console.error("[rules-manager] removeRule error:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Check an entity against the rules. Precedence: provider deny → area
 * deny → workspace deny → provider allow → area allow → workspace allow
 * → null (deny beats allow at every scope; tighter scope wins ties).
 *
 * Email-shaped entities (sender_email, contact, …) also match domain rules
 * derived from the key's domain part; sender_pattern globs match against
 * patternCandidates only.
 */
export async function checkRules(
  workspaceId: string,
  input: RuleCheckInput,
): Promise<RuleCheckResult> {
  const entity = input.entity;
  const key = entity
    ? normalizeRuleEntityKey(entity.type, entity.key)
    : null;
  if (entity && !key) return { verdict: null };
  const entityCandidates = input.entityCandidates ?? {};
  const hasCandidates =
    (input.patternCandidates ?? []).length > 0 ||
    Object.values(entityCandidates).some((list) => (list ?? []).length > 0);
  if (!entity && !hasCandidates) {
    return { verdict: null };
  }

  const { rules, error } = await loadScopedRules(
    workspaceId,
    input.provider,
    input.area ?? null,
  );
  if (error && rules.length === 0) {
    return { verdict: null };
  }

  const domain = key ? extractDomain(key) : null;
  const patternTargets = input.patternCandidates ?? [];

  const matches = (rule: ConnectorRule): boolean => {
    if (entity && key && rule.entityType === entity.type && rule.entityKey === key) {
      return true;
    }
    if (
      rule.entityType === "domain" &&
      domain !== null &&
      rule.entityKey === domain
    ) {
      return true;
    }
    if (rule.entityType === "sender_pattern") {
      return patternTargets.some((target) =>
        matchesSenderGlobPattern(rule.entityKey, target),
      );
    }
    if (GLOB_PATTERN_ENTITY_TYPES.has(rule.entityType)) {
      return (entityCandidates[rule.entityType] ?? []).some((target) =>
        matchesSenderGlobPattern(rule.entityKey, target),
      );
    }
    if (
      rule.entityType === "attendee" ||
      rule.entityType === "participant"
    ) {
      const ruleKey = rule.entityKey.toLowerCase();
      return (entityCandidates[rule.entityType] ?? []).some(
        (candidate) => candidate.toLowerCase() === ruleKey,
      );
    }
    return false;
  };

  const providerScoped = rules.filter((r) => r.provider !== null);
  const areaScoped = rules.filter((r) => r.provider === null && r.area !== null);
  const workspaceWide = rules.filter((r) => r.provider === null && r.area === null);

  for (const scope of [providerScoped, areaScoped, workspaceWide]) {
    for (const rule of scope) {
      if (rule.ruleType === "deny" && matches(rule)) {
        return { verdict: "deny", rule };
      }
    }
  }
  for (const scope of [providerScoped, areaScoped, workspaceWide]) {
    for (const rule of scope) {
      if (rule.ruleType === "allow" && matches(rule)) {
        return { verdict: "allow", rule };
      }
    }
  }

  return { verdict: null };
}
