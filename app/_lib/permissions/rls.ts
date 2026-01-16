/**
 * RLS (Row Level Security) Helpers
 * 
 * Utilities to ensure Supabase queries respect tenant boundaries.
 * These helpers add the correct WHERE clauses based on tenant context.
 * 
 * CRITICAL: Always use these when querying multi-tenant tables.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { TenantContext } from "../tenancy/types";

/**
 * Apply studio-scoped filter to a Supabase query.
 * 
 * Usage:
 * ```ts
 * const query = supabase.from("clients").select("*");
 * const scopedQuery = withStudioScope(query, context);
 * const { data } = await scopedQuery;
 * ```
 * 
 * Note: This is a helper for clarity; RLS policies are the true enforcer.
 */
export function withStudioScope<T>(
  query: any, // Supabase query builder
  context: TenantContext
) {
  if (context.actorType !== "studioMember" || !context.studio) {
    throw new Error("Studio context required for studio-scoped queries");
  }
  
  // Add studio_id filter
  return query.eq("studio_id", context.studio.id);
}

/**
 * Apply client-scoped filter to a Supabase query.
 * 
 * Usage:
 * ```ts
 * const query = supabase.from("projects").select("*");
 * const scopedQuery = withClientScope(query, context);
 * const { data } = await scopedQuery;
 * ```
 */
export function withClientScope<T>(
  query: any,
  context: TenantContext
) {
  if (context.actorType !== "clientUser" || !context.client) {
    throw new Error("Client context required for client-scoped queries");
  }
  
  // Add client_id filter
  return query.eq("client_id", context.client.id);
}

/**
 * Apply tenant-aware filter (works for both studio and client users).
 * 
 * This is the most commonly used helper—it automatically applies the
 * correct scope based on who is making the request.
 */
export function withTenantScope<T>(
  query: any,
  context: TenantContext,
  options?: {
    /** Override the column name for studio_id */
    studioIdColumn?: string;
    /** Override the column name for client_id */
    clientIdColumn?: string;
  }
) {
  const studioCol = options?.studioIdColumn || "studio_id";
  const clientCol = options?.clientIdColumn || "client_id";
  
  if (context.actorType === "studioMember" && context.studio) {
    return query.eq(studioCol, context.studio.id);
  }
  
  if (context.actorType === "clientUser" && context.client) {
    return query.eq(clientCol, context.client.id);
  }
  
  throw new Error("No valid tenant context for scoping");
}

/**
 * Get RLS context claims to pass to Supabase for custom RLS functions.
 * 
 * Usage with set_config for advanced RLS:
 * ```ts
 * const claims = getRLSClaims(context);
 * await supabase.rpc("set_tenant_context", claims);
 * ```
 */
export function getRLSClaims(context: TenantContext): Record<string, string> {
  const claims: Record<string, string> = {
    actor_type: context.actorType,
    user_id: context.userId || "",
  };
  
  if (context.studio) {
    claims.studio_id = context.studio.id;
    claims.studio_role = context.studio.role;
  }
  
  if (context.client) {
    claims.client_id = context.client.id;
    claims.client_role = context.client.role;
  }
  
  return claims;
}

/**
 * Verify RLS is enabled on a table.
 * Development/testing helper to catch missing RLS policies.
 * 
 * Usage in tests:
 * ```ts
 * await verifyRLSEnabled(supabase, "projects");
 * ```
 */
export async function verifyRLSEnabled(
  supabase: SupabaseClient,
  tableName: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("pg_tables")
    .select("tablename, rowsecurity")
    .eq("schemaname", "public")
    .eq("tablename", tableName)
    .single();
  
  if (error || !data) {
    console.warn(`Could not verify RLS for table: ${tableName}`);
    return false;
  }
  
  return data.rowsecurity === true;
}

