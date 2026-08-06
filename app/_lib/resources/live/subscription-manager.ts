import "server-only";

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { getComposioClient } from "@/app/_lib/composio/client";
import type { ResourceType } from "../types";

/**
 * Resource Live Mode Subscription Manager
 *
 * Manages Composio trigger subscriptions for individual resources.
 * When a resource switches to Live mode, we create a trigger subscription
 * that routes webhooks to the resource's bound entity.
 *
 * Unlike capture triggers (workspace-wide per provider), resource triggers
 * are per-resource and route to specific entities.
 */

interface TriggersApi {
  create(
    userId: string,
    slug: string,
    options: { connectedAccountId?: string; triggerConfig?: Record<string, unknown> },
  ): Promise<{ triggerId: string }>;
  delete(triggerId: string): Promise<unknown>;
}

function triggersApi(): TriggersApi {
  return getComposioClient().triggers as unknown as TriggersApi;
}

const RESOURCE_TYPE_TO_TRIGGER_SLUGS: Partial<Record<ResourceType, string[]>> = {
  github_repo: ["GITHUB_PUSH_EVENT", "GITHUB_PULL_REQUEST_EVENT", "GITHUB_ISSUE_EVENT"],
  github_pr: ["GITHUB_PULL_REQUEST_EVENT"],
  github_issue: ["GITHUB_ISSUE_EVENT"],
  linear_issue: ["LINEAR_ISSUE_UPDATE_TRIGGER"],
  linear_project: ["LINEAR_ISSUE_UPDATE_TRIGGER"],
  slack_channel: ["SLACK_NEW_MESSAGE_TRIGGER"],
  gdrive_doc: ["GOOGLEDRIVE_FILE_CHANGE_TRIGGER"],
  gdrive_sheet: ["GOOGLEDRIVE_FILE_CHANGE_TRIGGER"],
  gdrive_folder: ["GOOGLEDRIVE_FILE_CHANGE_TRIGGER"],
  figma_file: ["FIGMA_FILE_UPDATE_TRIGGER"],
};

const RESOURCE_TYPE_TO_PROVIDER: Partial<Record<ResourceType, string>> = {
  github_repo: "github",
  github_pr: "github",
  github_issue: "github",
  github_branch: "github",
  linear_issue: "linear",
  linear_project: "linear",
  slack_channel: "slack",
  gdrive_doc: "googledrive",
  gdrive_sheet: "googledrive",
  gdrive_folder: "googledrive",
  figma_file: "figma",
};

export interface EnableLiveModeResult {
  success: boolean;
  triggerId?: string;
  error?: string;
}

export async function enableResourceLiveMode(
  workspaceId: string,
  resourceId: string,
  resourceType: ResourceType,
  resourceIdentifier: string,
  liveConfig?: { events?: string[]; branch?: string },
): Promise<EnableLiveModeResult> {
  const triggerSlugs = RESOURCE_TYPE_TO_TRIGGER_SLUGS[resourceType];
  const provider = RESOURCE_TYPE_TO_PROVIDER[resourceType];

  if (!triggerSlugs || !provider) {
    return { success: false, error: "Resource type does not support Live mode" };
  }

  const admin = createAdminClient();

  const { data: integration } = await admin
    .from("workspace_integrations")
    .select("composio_connection_id")
    .eq("workspace_id", workspaceId)
    .eq("provider", provider)
    .maybeSingle();

  if (!integration?.composio_connection_id) {
    return {
      success: false,
      error: `${provider} is not connected. Connect it first to enable Live mode.`,
    };
  }

  const triggers = triggersApi();
  const triggerConfig: Record<string, unknown> = {};

  if (resourceType.startsWith("github_")) {
    const [owner, repo] = resourceIdentifier.split("/");
    if (owner && repo) {
      triggerConfig.owner = owner;
      triggerConfig.repo = repo;
    }
    if (liveConfig?.branch) {
      triggerConfig.branch = liveConfig.branch;
    }
  }

  const selectedSlugs = liveConfig?.events?.length
    ? triggerSlugs.filter((slug) =>
        liveConfig.events!.some((event) => slug.toLowerCase().includes(event.toLowerCase()))
      )
    : triggerSlugs;

  const createdIds: string[] = [];

  for (const slug of selectedSlugs) {
    try {
      const result = await triggers.create(workspaceId, slug, {
        connectedAccountId: integration.composio_connection_id,
        triggerConfig: {
          ...triggerConfig,
          resourceId,
          resourceType,
        },
      });
      createdIds.push(result.triggerId);
    } catch (error) {
      console.error(`[resource-live] Failed to create trigger ${slug}:`, error);
      for (const id of createdIds) {
        try {
          await triggers.delete(id);
        } catch {
          // best effort rollback
        }
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create trigger",
      };
    }
  }

  const composioTriggerId = createdIds.join(",");

  const { error: updateError } = await admin
    .from("files")
    .update({
      mode: "live",
      composio_trigger_id: composioTriggerId,
      live_config: liveConfig ?? {},
    })
    .eq("id", resourceId)
    .eq("workspace_id", workspaceId);

  if (updateError) {
    for (const id of createdIds) {
      try {
        await triggers.delete(id);
      } catch {
        // best effort
      }
    }
    return { success: false, error: "Failed to update resource" };
  }

  return { success: true, triggerId: composioTriggerId };
}

export async function disableResourceLiveMode(
  workspaceId: string,
  resourceId: string,
): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient();

  const { data: resource } = await admin
    .from("files")
    .select("composio_trigger_id")
    .eq("id", resourceId)
    .eq("workspace_id", workspaceId)
    .single();

  if (!resource) {
    return { success: false, error: "Resource not found" };
  }

  if (resource.composio_trigger_id) {
    const triggers = triggersApi();
    const triggerIds = resource.composio_trigger_id.split(",");

    for (const triggerId of triggerIds) {
      try {
        await triggers.delete(triggerId.trim());
      } catch (error) {
        console.warn(`[resource-live] Failed to delete trigger ${triggerId}:`, error);
      }
    }
  }

  const { error: updateError } = await admin
    .from("files")
    .update({
      mode: "static",
      composio_trigger_id: null,
      live_config: {},
    })
    .eq("id", resourceId)
    .eq("workspace_id", workspaceId);

  if (updateError) {
    return { success: false, error: "Failed to update resource" };
  }

  return { success: true };
}

export function getProviderForResourceType(resourceType: ResourceType): string | null {
  return RESOURCE_TYPE_TO_PROVIDER[resourceType] ?? null;
}

export function supportsLiveMode(resourceType: ResourceType): boolean {
  return resourceType in RESOURCE_TYPE_TO_TRIGGER_SLUGS;
}
