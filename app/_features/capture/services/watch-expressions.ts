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
import type { Database } from "@/app/_lib/supabase/database.types";

type WatchExpressionRow =
  Database["public"]["Tables"]["entity_watch_expressions"]["Row"];

export type WatchExpressionType = "email" | "domain" | "phone" | "name_pattern";

export interface WatchExpression {
  id: string;
  workspaceId: string;
  expressionType: WatchExpressionType;
  expressionValue: string;
  targetSurface: "people" | "organizations";
  targetEntityId: string;
  createdAt: string;
  lastMatchedAt: string | null;
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
function mapRowToWatchExpression(row: WatchExpressionRow): WatchExpression {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    expressionType: row.expression_type,
    expressionValue: row.expression_value,
    targetSurface: row.target_surface as "people" | "organizations",
    targetEntityId: row.target_entity_id,
    createdAt: row.created_at,
    lastMatchedAt: row.last_matched_at,
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
