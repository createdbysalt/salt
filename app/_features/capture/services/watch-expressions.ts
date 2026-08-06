import "server-only";

/**
 * Watch Expressions (Captures V2 Phase 3).
 *
 * Continuous awareness for Memory entities:
 * - When a Person is created → register email + domain watches
 * - When an Org is created → register domain watches
 * - During ingest → check for watch matches, fast-track to entity
 * - On match → optionally trigger re-enrichment (throttled to 24h)
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";

export type WatchExpressionType = "email" | "domain" | "phone" | "name_pattern";
export type WatchPurpose = "existing_entity" | "pending_contact";

export interface AccumulatedSignal {
  type: string;
  weight: number;
  evidence?: string;
  captured_at: string;
}

export interface WatchExpression {
  id: string;
  workspaceId: string;
  expressionType: WatchExpressionType;
  expressionValue: string;
  targetSurface: "people" | "organizations";
  targetEntityId: string;
  createdAt: string;
  lastMatchedAt: string | null;
  /** Purpose of this watch */
  watchPurpose: WatchPurpose;
  /** Accumulated signals from multiple captures (pending_contact only) */
  accumulatedSignals: AccumulatedSignal[];
  /** Number of captures that matched this watch */
  captureCount: number;
  /** Why this watch was created */
  initialReason: string | null;
}

export interface WatchMatch {
  expression: WatchExpression;
  matchedValue: string;
}

export interface RegisterWatchInput {
  workspaceId: string;
  targetSurface: "people" | "organizations";
  targetEntityId: string;
  emails?: string[];
  domains?: string[];
  phones?: string[];
}

export async function registerWatchExpressions(
  input: RegisterWatchInput
): Promise<{ registered: number; skipped: number }> {
  const { workspaceId, targetSurface, targetEntityId, emails, domains, phones } = input;
  const admin = createAdminClient();

  const expressions: Array<{
    workspace_id: string;
    expression_type: WatchExpressionType;
    expression_value: string;
    target_surface: string;
    target_entity_id: string;
  }> = [];

  for (const email of emails ?? []) {
    const normalized = email.toLowerCase().trim();
    if (normalized && normalized.includes("@")) {
      expressions.push({
        workspace_id: workspaceId,
        expression_type: "email",
        expression_value: normalized,
        target_surface: targetSurface,
        target_entity_id: targetEntityId,
      });

      const domain = normalized.split("@")[1];
      if (domain && !isCommonDomain(domain)) {
        expressions.push({
          workspace_id: workspaceId,
          expression_type: "domain",
          expression_value: domain,
          target_surface: targetSurface === "people" ? "organizations" : targetSurface,
          target_entity_id: targetEntityId,
        });
      }
    }
  }

  for (const domain of domains ?? []) {
    const normalized = domain.toLowerCase().trim().replace(/^@/, "");
    if (normalized && !isCommonDomain(normalized)) {
      expressions.push({
        workspace_id: workspaceId,
        expression_type: "domain",
        expression_value: normalized,
        target_surface: targetSurface,
        target_entity_id: targetEntityId,
      });
    }
  }

  for (const phone of phones ?? []) {
    const normalized = normalizePhone(phone);
    if (normalized) {
      expressions.push({
        workspace_id: workspaceId,
        expression_type: "phone",
        expression_value: normalized,
        target_surface: targetSurface,
        target_entity_id: targetEntityId,
      });
    }
  }

  if (expressions.length === 0) {
    return { registered: 0, skipped: 0 };
  }

  const { data, error } = await admin
    .from("entity_watch_expressions")
    .upsert(expressions, { onConflict: "workspace_id,expression_type,expression_value" })
    .select("id");

  if (error) {
    console.error("[watch-expressions] Failed to register:", error.message);
    return { registered: 0, skipped: expressions.length };
  }

  return { registered: data?.length ?? 0, skipped: expressions.length - (data?.length ?? 0) };
}

/** Map database row to WatchExpression type */
function mapRowToWatchExpression(row: {
  id: string;
  workspace_id: string;
  expression_type: string;
  expression_value: string;
  target_surface: string;
  target_entity_id: string;
  created_at: string;
  last_matched_at: string | null;
  watch_purpose?: string | null;
  accumulated_signals?: unknown[] | null;
  capture_count?: number | null;
  initial_reason?: string | null;
}): WatchExpression {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    expressionType: row.expression_type as WatchExpressionType,
    expressionValue: row.expression_value,
    targetSurface: row.target_surface as "people" | "organizations",
    targetEntityId: row.target_entity_id,
    createdAt: row.created_at,
    lastMatchedAt: row.last_matched_at,
    watchPurpose: (row.watch_purpose as WatchPurpose) ?? "existing_entity",
    accumulatedSignals: (row.accumulated_signals as AccumulatedSignal[]) ?? [],
    captureCount: row.capture_count ?? 0,
    initialReason: row.initial_reason ?? null,
  };
}

export async function matchWatchExpressions(
  workspaceId: string,
  values: { emails?: string[]; domains?: string[]; phones?: string[] }
): Promise<WatchMatch[]> {
  const admin = createAdminClient();
  const matches: WatchMatch[] = [];

  const lookups: Array<{ type: WatchExpressionType; value: string }> = [];

  for (const email of values.emails ?? []) {
    const normalized = email.toLowerCase().trim();
    if (normalized) {
      lookups.push({ type: "email", value: normalized });
    }
  }

  for (const domain of values.domains ?? []) {
    const normalized = domain.toLowerCase().trim().replace(/^@/, "");
    if (normalized) {
      lookups.push({ type: "domain", value: normalized });
    }
  }

  for (const phone of values.phones ?? []) {
    const normalized = normalizePhone(phone);
    if (normalized) {
      lookups.push({ type: "phone", value: normalized });
    }
  }

  if (lookups.length === 0) {
    return [];
  }

  for (const lookup of lookups) {
    const { data } = await admin
      .from("entity_watch_expressions")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("expression_type", lookup.type)
      .eq("expression_value", lookup.value)
      .limit(1)
      .maybeSingle();

    if (data) {
      matches.push({
        expression: mapRowToWatchExpression(data),
        matchedValue: lookup.value,
      });
    }
  }

  return matches;
}

export async function updateWatchMatchTimestamp(
  expressionId: string
): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("entity_watch_expressions")
    .update({ last_matched_at: new Date().toISOString() })
    .eq("id", expressionId);
}

export async function shouldReenrich(
  expressionId: string,
  throttleHours: number = 24
): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("entity_watch_expressions")
    .select("last_matched_at")
    .eq("id", expressionId)
    .single();

  if (!data?.last_matched_at) {
    return true;
  }

  const lastMatch = new Date(data.last_matched_at);
  const throttleMs = throttleHours * 60 * 60 * 1000;
  return Date.now() - lastMatch.getTime() > throttleMs;
}

export async function getWatchesForEntity(
  targetSurface: "people" | "organizations",
  targetEntityId: string
): Promise<WatchExpression[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("entity_watch_expressions")
    .select("*")
    .eq("target_surface", targetSurface)
    .eq("target_entity_id", targetEntityId);

  return (data ?? []).map(mapRowToWatchExpression);
}

export async function deleteWatchesForEntity(
  targetSurface: "people" | "organizations",
  targetEntityId: string
): Promise<number> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("entity_watch_expressions")
    .delete()
    .eq("target_surface", targetSurface)
    .eq("target_entity_id", targetEntityId)
    .select("id");

  return data?.length ?? 0;
}

// ============= Pending Contact Watch Functions =============

export interface CreatePendingContactInput {
  workspaceId: string;
  expressionType: "email" | "domain";
  expressionValue: string;
  initialSignals: AccumulatedSignal[];
  reason: string;
}

/**
 * Create a pending contact watch for signal accumulation.
 * Unlike entity watches, these don't have a target entity yet.
 */
export async function createPendingContactWatch(
  input: CreatePendingContactInput
): Promise<WatchExpression | null> {
  const admin = createAdminClient();

  const normalizedValue = input.expressionValue.toLowerCase().trim();

  // Use a placeholder entity ID for pending contacts (will be replaced when graduated)
  const placeholderEntityId = "00000000-0000-0000-0000-000000000000";

  const { data, error } = await admin
    .from("entity_watch_expressions")
    .upsert(
      {
        workspace_id: input.workspaceId,
        expression_type: input.expressionType,
        expression_value: normalizedValue,
        target_surface: "people", // Default; will be determined at graduation
        target_entity_id: placeholderEntityId,
        watch_purpose: "pending_contact",
        accumulated_signals: input.initialSignals,
        capture_count: 1,
        initial_reason: input.reason,
      },
      { onConflict: "workspace_id,expression_type,expression_value" }
    )
    .select("*")
    .single();

  if (error) {
    console.error("[watch-expressions] Failed to create pending contact:", error.message);
    return null;
  }

  return data ? mapRowToWatchExpression(data) : null;
}

/**
 * Accumulate new signals on an existing pending contact watch.
 * Returns the updated watch expression.
 */
export async function accumulateWatchSignals(
  expressionId: string,
  newSignals: AccumulatedSignal[]
): Promise<WatchExpression | null> {
  const admin = createAdminClient();

  // First get current state
  const { data: current } = await admin
    .from("entity_watch_expressions")
    .select("*")
    .eq("id", expressionId)
    .single();

  if (!current) return null;

  const existingSignals = (current.accumulated_signals as AccumulatedSignal[]) ?? [];
  const mergedSignals = [...existingSignals, ...newSignals];
  const newCount = (current.capture_count ?? 0) + 1;

  const { data, error } = await admin
    .from("entity_watch_expressions")
    .update({
      accumulated_signals: mergedSignals,
      capture_count: newCount,
      last_matched_at: new Date().toISOString(),
    })
    .eq("id", expressionId)
    .select("*")
    .single();

  if (error) {
    console.error("[watch-expressions] Failed to accumulate signals:", error.message);
    return null;
  }

  return data ? mapRowToWatchExpression(data) : null;
}

/**
 * Graduate a pending contact watch to an entity watch.
 * Called when the contact is created as a Person/Org.
 */
export async function graduateWatch(
  expressionId: string,
  targetSurface: "people" | "organizations",
  targetEntityId: string
): Promise<boolean> {
  const admin = createAdminClient();

  const { error } = await admin
    .from("entity_watch_expressions")
    .update({
      target_surface: targetSurface,
      target_entity_id: targetEntityId,
      watch_purpose: "existing_entity",
    })
    .eq("id", expressionId);

  if (error) {
    console.error("[watch-expressions] Failed to graduate watch:", error.message);
    return false;
  }

  return true;
}

/**
 * Get all pending contact watches for a workspace.
 * Useful for batch processing and cleanup.
 */
export async function getPendingContactWatches(
  workspaceId: string
): Promise<WatchExpression[]> {
  const admin = createAdminClient();

  const { data } = await admin
    .from("entity_watch_expressions")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("watch_purpose", "pending_contact");

  return (data ?? []).map(mapRowToWatchExpression);
}

/**
 * Delete stale pending contact watches (no activity for N days).
 */
export async function cleanupStaleWatches(
  workspaceId: string,
  staleDays: number = 30
): Promise<number> {
  const admin = createAdminClient();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - staleDays);

  const { data } = await admin
    .from("entity_watch_expressions")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("watch_purpose", "pending_contact")
    .lt("last_matched_at", cutoff.toISOString())
    .select("id");

  return data?.length ?? 0;
}

const COMMON_DOMAINS = new Set([
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "icloud.com",
  "aol.com",
  "protonmail.com",
  "mail.com",
  "live.com",
  "msn.com",
]);

function isCommonDomain(domain: string): boolean {
  return COMMON_DOMAINS.has(domain.toLowerCase());
}

function normalizePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return null;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length > 10) return `+${digits}`;
  return null;
}
