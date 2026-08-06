import "server-only";

import { getComposioProviderForToolSlug } from "@/app/_features/connectors/connector-capabilities";
import { executeComposioAction } from "@/app/_lib/composio/actions";
import { createAdminClient } from "@/app/_lib/supabase/admin";

/**
 * Run one connector tool on behalf of a play.
 *
 * Shared by the play executor and the paused-playbook resume path. Both need
 * the same three things — resolve the provider, find the workspace's connected
 * integration, execute through the policy gate — and both run without a user
 * session, so consent provenance has to be carried explicitly rather than read
 * from auth.
 *
 * ⚠️ RLS IS BYPASSED. The integration lookup uses the service-role client, so
 * the `workspace_id` filter below is the entire tenant boundary. Do not remove it.
 */

export interface ExecuteConnectorToolContext {
  workspaceId: string;
  /** The human whose approval authorises this execution. Audit provenance. */
  actorUserId: string;
  /**
   * Slugs the user consented to. The policy gate refuses anything outside this
   * list, so it must reflect real consent — never widen it for convenience.
   */
  approvedActions: readonly string[];
}

export async function executeConnectorTool<R>(
  toolSlug: string,
  params: unknown,
  context: ExecuteConnectorToolContext,
): Promise<R> {
  const admin = createAdminClient();

  const provider = getComposioProviderForToolSlug(toolSlug);
  if (!provider) {
    throw new Error(`No connector provider known for tool ${toolSlug}`);
  }

  const { data: integration } = await admin
    .from("workspace_integrations")
    .select("composio_connection_id, user_id")
    .eq("workspace_id", context.workspaceId)
    .eq("provider", `composio:${provider}`)
    .eq("composio_status", "connected")
    .maybeSingle();

  if (!integration?.composio_connection_id || !integration.user_id) {
    throw new Error(
      `Connector ${provider} is not connected — connect it in Settings before this play can run`,
    );
  }

  return executeComposioAction<unknown, R>(
    toolSlug,
    params,
    integration.composio_connection_id,
    integration.user_id,
    {
      // No user session here; consent provenance is the approver, carried as
      // actorUserId per the Part 2 contract.
      skipAuthCheck: true,
      workspaceId: context.workspaceId,
      actorUserId: context.actorUserId,
      play: { approvedActions: context.approvedActions },
    },
  );
}
