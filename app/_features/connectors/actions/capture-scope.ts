"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAuthenticatedWorkspaceMember } from "@/app/_lib/composio/workspace-auth";
import { createAdminClient } from "@/app/_lib/supabase/admin";
import { executeComposioAction } from "@/app/_lib/composio/actions";
import {
  applyScopeToSpecs,
  scopableProvider,
  scopeKindForProvider,
  scopeTargetSlug,
  withCaptureScope,
  GMAIL_CATEGORIES,
  type CaptureScope,
  type CaptureScopeOption,
} from "@/app/_lib/composio/capture-scope";
import {
  getCaptureTriggerSpecs,
  upsertCaptureTriggerConfig,
} from "@/app/_lib/composio/trigger-subscriptions";

/**
 * Per-connection capture scoping (Sources plan 4.5).
 *
 * The detail pane's pickers write workspace_integrations.config.captureScope
 * here and — when capture is live — immediately re-subscribe the scoped
 * trigger through the 4.2 upsert wrapper (no delete+recreate gap). The
 * stored scope is what enable/reconciliation merge back in, so scoping is
 * durable across re-subscribes.
 */

const ScopeSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("slack_channel"),
    channelId: z.string().min(1),
    label: z.string().min(1),
  }),
  z.object({
    kind: z.literal("calendar"),
    calendarId: z.string().min(1),
    label: z.string().min(1),
  }),
  z.object({
    kind: z.literal("drive_folder"),
    folderId: z.string().min(1),
    label: z.string().min(1),
  }),
  z.object({
    kind: z.literal("gmail_categories"),
    excluded: z.array(z.enum(GMAIL_CATEGORIES)),
  }),
]);

const UpdateScopeSchema = z.object({
  provider: z.string().min(1),
  scope: ScopeSchema.nullable(),
});

type ActionResult = { success: true } | { success: false; error: string };

export async function updateConnectorCaptureScope(input: {
  provider: string;
  scope: CaptureScope | null;
}): Promise<ActionResult> {
  const parsed = UpdateScopeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid request." };
  }
  const { provider, scope } = parsed.data;

  if (!scopableProvider(provider)) {
    return { success: false, error: "This connector doesn't support scoping." };
  }
  if (scope && scope.kind !== scopeKindForProvider(provider)) {
    return { success: false, error: "Invalid request." };
  }

  const member = await requireAuthenticatedWorkspaceMember();
  if (!member.ok) {
    return { success: false, error: member.error };
  }

  const admin = createAdminClient();
  const { data: integration } = await admin
    .from("workspace_integrations")
    .select("id, is_active, capture_enabled, config")
    .eq("workspace_id", member.workspaceId)
    .eq("provider", provider)
    .maybeSingle();

  if (!integration?.is_active) {
    return { success: false, error: "Connect this account first." };
  }

  const config = (integration.config ?? {}) as Record<string, unknown>;

  // Capture live: re-subscribe FIRST, persist only on success — the stored
  // scope must never claim a filter the live subscription doesn't have.
  // Scope null upserts the global spec, which is exactly how a removed
  // filter comes off the live subscription.
  if (integration.capture_enabled === true) {
    const scopedSpecs = applyScopeToSpecs(
      provider,
      await getCaptureTriggerSpecs(provider),
      scope,
    );
    const targetSlug = scopeTargetSlug(provider);
    const target = scopedSpecs.find((spec) => spec.slug === targetSlug);
    if (target) {
      const upserted = await upsertCaptureTriggerConfig(
        member.workspaceId,
        provider,
        target,
      );
      if (!upserted.ok) {
        return {
          success: false,
          error: upserted.error ?? "Could not apply the filter.",
        };
      }
    }
  }

  const { error } = await admin
    .from("workspace_integrations")
    .update({ config: withCaptureScope(config, scope) as never })
    .eq("id", integration.id);

  if (error) {
    return { success: false, error: "Failed to save the filter." };
  }

  revalidatePath("/sources");
  revalidatePath("/connectors");
  return { success: true };
}

// ============================================================================
// Scope-option listing (picker data)
// ============================================================================

type OptionsResult =
  | { success: true; options: CaptureScopeOption[] }
  | { success: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Pull the first array of records found under any of `keys`. */
function recordArray(payload: unknown, keys: string[]): Record<string, unknown>[] {
  if (!isRecord(payload)) return [];
  for (const key of keys) {
    const value = payload[key];
    if (Array.isArray(value)) {
      return value.filter(isRecord);
    }
  }
  return [];
}

/**
 * executeComposioAction unwraps the envelope, so a failed tool call arrives
 * as { http_error, message, status_code } with no `successful` flag. Detect
 * that shape — otherwise a 403 from the provider renders as a dishonest
 * "Nothing found on this account" empty state.
 */
function looksLikeToolError(payload: unknown): boolean {
  if (!isRecord(payload)) return false;
  if (typeof payload.http_error === "string") return true;
  if (typeof payload.status_code === "number" && payload.status_code >= 400) return true;
  return false;
}

function toOptions(
  rows: Record<string, unknown>[],
  idKeys: string[],
  labelKeys: string[],
): CaptureScopeOption[] {
  const options: CaptureScopeOption[] = [];
  for (const row of rows) {
    const id = idKeys.map((k) => row[k]).find((v) => typeof v === "string" && v);
    const label = labelKeys.map((k) => row[k]).find((v) => typeof v === "string" && v);
    if (typeof id === "string" && typeof label === "string") {
      options.push({ id, label });
    }
  }
  return options;
}

/**
 * Load the picker's options for a provider by calling its list tool through
 * the metered executor (user-initiated read). Gmail has no options call —
 * its categories are a fixed set the UI renders directly.
 */
export async function listCaptureScopeOptions(input: {
  provider: string;
}): Promise<OptionsResult> {
  const provider = z.string().min(1).safeParse(input.provider);
  if (!provider.success || !scopableProvider(provider.data)) {
    return { success: false, error: "This connector doesn't support scoping." };
  }

  const member = await requireAuthenticatedWorkspaceMember();
  if (!member.ok) {
    return { success: false, error: member.error };
  }

  const admin = createAdminClient();
  const { data: integration } = await admin
    .from("workspace_integrations")
    .select("id, is_active, composio_connection_id")
    .eq("workspace_id", member.workspaceId)
    .eq("provider", provider.data)
    .maybeSingle();

  if (!integration?.is_active || !integration.composio_connection_id) {
    return { success: false, error: "Connect this account first." };
  }

  const connectionId = integration.composio_connection_id;
  const exec = <R>(toolSlug: string, toolInput: Record<string, unknown>) =>
    executeComposioAction<Record<string, unknown>, R>(toolSlug, toolInput, connectionId, member.workspaceId, {
      workspaceId: member.workspaceId,
      actorUserId: member.userId,
    });

  try {
    switch (provider.data) {
      case "slack": {
        const payload = await exec<unknown>("SLACK_CONVERSATIONS_LIST", {
          types: "public_channel,private_channel",
          exclude_archived: true,
          limit: 200,
        });
        if (looksLikeToolError(payload)) {
          return { success: false, error: "The connected account refused the request — try reconnecting." };
        }
        const channels = toOptions(
          recordArray(payload, ["channels", "data", "items"]),
          ["id"],
          ["name", "name_normalized"],
        ).map((option) => ({ ...option, label: `#${option.label}` }));
        return { success: true, options: channels };
      }
      case "googlecalendar": {
        const payload = await exec<unknown>("GOOGLECALENDAR_LIST_CALENDARS", {
          max_results: 100,
        });
        if (looksLikeToolError(payload)) {
          return { success: false, error: "The connected account refused the request — try reconnecting." };
        }
        const calendars = toOptions(
          recordArray(payload, ["items", "calendars", "data"]),
          ["id"],
          ["summary", "id"],
        );
        return { success: true, options: calendars };
      }
      case "googledrive": {
        const payload = await exec<unknown>("GOOGLEDRIVE_LIST_FILES", {
          q: "mimeType = 'application/vnd.google-apps.folder' and trashed = false",
          pageSize: 100,
          orderBy: "name",
          fields: "files(id,name)",
        });
        if (looksLikeToolError(payload)) {
          return { success: false, error: "The connected account refused the request — try reconnecting." };
        }
        const folders = toOptions(
          recordArray(payload, ["files", "items", "data"]),
          ["id"],
          ["name"],
        );
        return { success: true, options: folders };
      }
      default:
        return { success: true, options: [] };
    }
  } catch (error) {
    console.error("[capture-scope] option listing failed:", provider.data, error);
    return {
      success: false,
      error: "Could not load options from the connected account.",
    };
  }
}
