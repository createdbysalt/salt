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

/**
 * The connector itself is the problem — disconnected or an expired grant —
 * not the playbook or the args. The executor parks the run (state "blocked")
 * with the pending call intact so approving it after a reconnect resumes the
 * exact step that failed. Distinguishing this from a real execution error
 * matters: a parked run is recoverable, an errored run is dead.
 */
export class ConnectorUnavailableError extends Error {
  constructor(
    message: string,
    readonly provider: string
  ) {
    super(message);
    this.name = "ConnectorUnavailableError";
  }
}

/** Conservative auth-expiry matcher for errors coming out of Composio. */
function looksLikeAuthFailure(message: string): boolean {
  return /reconnect|not connected|authentication|unauthorized|invalid grant|token expired/i.test(
    message
  );
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
    .select("composio_connection_id")
    .eq("workspace_id", context.workspaceId)
    .eq("provider", provider)
    .eq("composio_status", "connected")
    .maybeSingle();

  if (!integration?.composio_connection_id) {
    throw new ConnectorUnavailableError(
      `Connector ${provider} is not connected — connect it in Settings before this play can run`,
      provider
    );
  }

  try {
    return await executeComposioAction<unknown, R>(
      toolSlug,
      params,
      integration.composio_connection_id,
      // Composio v3 entity id is workspace-scoped (composio.create(workspaceId));
      // the human actor is carried separately below.
      context.workspaceId,
      {
        // No user session here; consent provenance is the approver, carried as
        // actorUserId per the Part 2 contract.
        skipAuthCheck: true,
        workspaceId: context.workspaceId,
        actorUserId: context.actorUserId,
        play: { approvedActions: context.approvedActions },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (looksLikeAuthFailure(message)) {
      throw new ConnectorUnavailableError(
        `Connector ${provider} needs attention — ${message}`,
        provider
      );
    }
    throw error;
  }
}
