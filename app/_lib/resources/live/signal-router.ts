import "server-only";

import { createAdminClient } from "@/app/_lib/supabase/admin";
import type { Database, Json } from "@/app/_lib/supabase/database.types";
import type { ResourceMode, ResourceType } from "../types";

/**
 * Resource Signal Router
 *
 * Routes incoming Composio webhooks for resources to the appropriate entity.
 * Creates signals that playbooks can react to.
 */

type FilesUpdate = Database["public"]["Tables"]["resources"]["Update"];

export type ResourceSignalType =
  | "github_pr_opened"
  | "github_pr_merged"
  | "github_pr_closed"
  | "github_push"
  | "github_release"
  | "github_issue_opened"
  | "github_issue_closed"
  | "figma_file_updated"
  | "gdrive_doc_updated"
  | "linear_issue_updated"
  | "slack_message_received"
  | "resource_activity";

export interface ResourceSignal {
  key: ResourceSignalType;
  resourceId: string;
  resourceType: ResourceType;
  workspaceId: string;
  entityType: string;
  entityId: string;
  timestamp: string;
  evidence: {
    resourceUrl?: string;
    providerEventId?: string;
    providerPayload?: Record<string, Json | undefined>;
    summary?: string;
    prNumber?: number;
    prTitle?: string;
    prAuthor?: string;
    commitSha?: string;
    branch?: string;
    action?: string;
  };
}

interface ComposioWebhookPayload {
  triggerName: string;
  triggerId: string;
  payload: Record<string, unknown>;
  metadata?: {
    resourceId?: string;
    resourceType?: string;
  };
}

export async function routeResourceWebhook(
  webhook: ComposioWebhookPayload,
): Promise<{ success: boolean; signal?: ResourceSignal; workspaceId?: string; error?: string }> {
  const { triggerName, payload, metadata } = webhook;

  if (!metadata?.resourceId) {
    return { success: false, error: "No resource ID in webhook metadata" };
  }

  const admin = createAdminClient();

  const { data: resource } = await admin
    .from("resources")
    .select("id, workspace_id, resource_type, external_url, mode")
    .eq("id", metadata.resourceId)
    .single();

  if (!resource) {
    return { success: false, error: "Resource not found" };
  }

  if (resource.mode !== "live") {
    return { success: false, error: "Resource is not in live mode" };
  }

  const { data: entityLink } = await admin
    .from("entity_links")
    .select("target_type, target_id")
    // Dual-read: legacy rows may still carry the pre-rename "file" spelling
    .in("source_type", ["resource", "file"])
    .eq("source_id", resource.id)
    .limit(1)
    .single();

  if (!entityLink) {
    return { success: false, error: "Resource is not linked to an entity" };
  }

  const signal = mapTriggerToSignal(
    triggerName,
    payload,
    resource.id,
    resource.resource_type as ResourceType,
    resource.workspace_id,
    entityLink.target_type,
    entityLink.target_id,
    resource.external_url,
  );

  if (!signal) {
    return { success: false, error: "Could not map trigger to signal" };
  }

  const activityUpdate: FilesUpdate = {
    last_activity_at: signal.timestamp,
    last_activity_summary: signal.evidence.summary,
  };

  await admin.from("resources").update(activityUpdate).eq("id", resource.id);

  await storeSignal(signal);

  return { success: true, signal, workspaceId: resource.workspace_id };
}

function mapTriggerToSignal(
  triggerName: string,
  payload: Record<string, unknown>,
  resourceId: string,
  resourceType: ResourceType,
  workspaceId: string,
  entityType: string,
  entityId: string,
  resourceUrl: string | null,
): ResourceSignal | null {
  const timestamp = new Date().toISOString();
  const baseSignal = {
    resourceId,
    resourceType,
    workspaceId,
    entityType,
    entityId,
    timestamp,
    evidence: {
      resourceUrl: resourceUrl ?? undefined,
      // Webhook body is JSON by construction; narrow it to the Json shape once here.
      providerPayload: payload as Record<string, Json | undefined>,
    },
  };

  if (triggerName.includes("PULL_REQUEST")) {
    const pr = payload.pull_request as Record<string, unknown> | undefined;
    const action = payload.action as string;

    let key: ResourceSignalType = "github_pr_opened";
    let summary = "PR activity";

    if (action === "opened") {
      key = "github_pr_opened";
      summary = `PR #${pr?.number} opened: ${pr?.title}`;
    } else if (action === "closed" && pr?.merged) {
      key = "github_pr_merged";
      summary = `PR #${pr?.number} merged: ${pr?.title}`;
    } else if (action === "closed") {
      key = "github_pr_closed";
      summary = `PR #${pr?.number} closed: ${pr?.title}`;
    }

    return {
      ...baseSignal,
      key,
      evidence: {
        ...baseSignal.evidence,
        prNumber: pr?.number as number,
        prTitle: pr?.title as string,
        prAuthor: (pr?.user as Record<string, unknown>)?.login as string,
        action,
        summary,
      },
    };
  }

  if (triggerName.includes("PUSH")) {
    const commits = payload.commits as Array<Record<string, unknown>> | undefined;
    const ref = payload.ref as string;
    const branch = ref?.replace("refs/heads/", "");
    const commitCount = commits?.length ?? 0;
    const summary = `${commitCount} commit${commitCount === 1 ? "" : "s"} pushed to ${branch}`;

    return {
      ...baseSignal,
      key: "github_push",
      evidence: {
        ...baseSignal.evidence,
        branch,
        commitSha: payload.after as string,
        summary,
      },
    };
  }

  if (triggerName.includes("ISSUE")) {
    const issue = payload.issue as Record<string, unknown> | undefined;
    const action = payload.action as string;

    const key: ResourceSignalType =
      action === "opened" ? "github_issue_opened" : "github_issue_closed";
    const summary = `Issue #${issue?.number} ${action}: ${issue?.title}`;

    return {
      ...baseSignal,
      key,
      evidence: {
        ...baseSignal.evidence,
        action,
        summary,
      },
    };
  }

  if (triggerName.includes("FIGMA")) {
    return {
      ...baseSignal,
      key: "figma_file_updated",
      evidence: {
        ...baseSignal.evidence,
        summary: "Figma file updated",
      },
    };
  }

  if (triggerName.includes("GOOGLEDRIVE") || triggerName.includes("FILE_CHANGE")) {
    return {
      ...baseSignal,
      key: "gdrive_doc_updated",
      evidence: {
        ...baseSignal.evidence,
        summary: "Document updated",
      },
    };
  }

  if (triggerName.includes("LINEAR")) {
    const issue = payload.data as Record<string, unknown> | undefined;
    return {
      ...baseSignal,
      key: "linear_issue_updated",
      evidence: {
        ...baseSignal.evidence,
        summary: `Linear issue updated: ${issue?.title ?? "Unknown"}`,
      },
    };
  }

  if (triggerName.includes("SLACK")) {
    return {
      ...baseSignal,
      key: "slack_message_received",
      evidence: {
        ...baseSignal.evidence,
        summary: "New message in channel",
      },
    };
  }

  return {
    ...baseSignal,
    key: "resource_activity",
    evidence: {
      ...baseSignal.evidence,
      summary: "Activity detected",
    },
  };
}

async function storeSignal(signal: ResourceSignal): Promise<void> {
  const admin = createAdminClient();

  await Promise.all([
    admin.from("resource_signals").insert({
      workspace_id: signal.workspaceId,
      resource_id: signal.resourceId,
      resource_type: signal.resourceType,
      entity_type: signal.entityType,
      entity_id: signal.entityId,
      signal_key: signal.key,
      evidence: signal.evidence,
      created_at: signal.timestamp,
    }),
    admin.from("activity_entries").insert({
      workspace_id: signal.workspaceId,
      action: "resource_activity",
      title: signal.evidence.summary ?? "Resource activity detected",
      detail: signal.evidence.resourceUrl ?? null,
      metadata: {
        playerSlug: "memory-care",
        signal_key: signal.key,
        resource_id: signal.resourceId,
        resource_type: signal.resourceType,
        entity_type: signal.entityType,
        entity_id: signal.entityId,
        source_url: signal.evidence.resourceUrl,
        ...signal.evidence,
      },
      created_at: signal.timestamp,
    }),
  ]);
}
