import "server-only";

import type { ToolSet } from "ai";
import { getWorkspaceConnectorPolicy } from "@/app/_features/connectors/queries";
import { createClient } from "@/app/_lib/supabase/server";
import { getComposioAgentClient } from "./client";
import { getConnectionStatus, checkConnectionHealth } from "./connections";
import {
  getCachedConnectionHealth,
  setCachedConnectionHealth,
} from "./health-check-cache";
import { listAskSaltEntries } from "./connector-registry";
import { wrapComposioToolsForAskSalt } from "./ask-salt-tools";

export interface AskSaltToolLoadContext {
  /** Auth user chatting with Ask Salt, recorded in the execution audit log. */
  userId?: string;
  /**
   * Ask Salt conversation id. When present, the Tool Router session is
   * reused across messages in the conversation (stored on the conversation
   * row) instead of creating a fresh session per message (plan 3.6).
   */
  conversationId?: string;
}

export interface AskSaltComposioToolLoad {
  /** Wrapped, policy-enforced tools ready to hand to the model. */
  tools: ToolSet;
  /** Toolkits with an active workspace connection at load time. */
  connectedToolkits: string[];
  /** Composio connected-account id per connected toolkit (gate execution). */
  connectionIdByToolkit: Record<string, string>;
  /** Composio slugs that passed policy and were preloaded into the session. */
  loadedSlugs: string[];
  /**
   * Set when the Composio session/tool fetch threw. Tools is `{}` in that
   * case even though the toolkit is connected — distinct from "connected but
   * every tool disabled by policy", where loadError is null.
   */
  loadError: string | null;
}

interface ConnectedToolkitStatus {
  connectedToolkits: string[];
  connectionIdByToolkit: Record<string, string>;
}

async function getConnectedToolkitStatuses(
  workspaceId: string,
): Promise<ConnectedToolkitStatus> {
  const askSaltEntries = await listAskSaltEntries();
  const statuses = await Promise.all(
    askSaltEntries.map(async (entry) => ({
      toolkit: entry.toolkitSlug,
      status: await getConnectionStatus(entry.toolkitSlug, workspaceId),
    })),
  );
  const connected = statuses.filter(({ status }) => status.connected);

  // Run health checks on connected toolkits (logs diagnostics, syncs expired
  // status). Verdicts are cached ~10 min (plan 3.6) so a chat conversation
  // doesn't pay a live connectedAccounts.get per toolkit per message.
  if (connected.length > 0) {
    const healthChecks = await Promise.all(
      connected.map(async ({ toolkit }) => {
        const cached = getCachedConnectionHealth(workspaceId, toolkit);
        if (cached) return { toolkit, health: cached };
        const health = await checkConnectionHealth(toolkit, workspaceId, { syncStatus: true });
        setCachedConnectionHealth(workspaceId, toolkit, health);
        return { toolkit, health };
      }),
    );

    // Filter out unhealthy connections
    const healthy = healthChecks.filter(({ health }) => health.healthy);
    const unhealthy = healthChecks.filter(({ health }) => !health.healthy);

    if (unhealthy.length > 0) {
      console.warn("[ask-salt] Unhealthy connections detected:", unhealthy.map(({ toolkit, health }) => ({
        toolkit,
        localStatus: health.localStatus,
        remoteStatus: health.remoteStatus,
        diagnostics: health.diagnostics,
      })));
    }

    return {
      connectedToolkits: healthy.map(({ toolkit }) => toolkit),
      connectionIdByToolkit: Object.fromEntries(
        healthy
          .filter(({ health }) => health.composioConnectionId)
          .map(({ toolkit, health }) => [toolkit, health.composioConnectionId as string]),
      ),
    };
  }

  return {
    connectedToolkits: connected.map(({ toolkit }) => toolkit),
    connectionIdByToolkit: Object.fromEntries(
      connected
        .filter(({ status }) => status.composioConnectionId)
        .map(({ toolkit, status }) => [toolkit, status.composioConnectionId as string]),
    ),
  };
}

/**
 * Per-app connectors: only toolkits with an active workspace connection are
 * registered, so Salt never offers tools for apps the user hasn't linked.
 */
export async function getConnectedAskSaltToolkits(workspaceId: string): Promise<string[]> {
  const { connectedToolkits } = await getConnectedToolkitStatuses(workspaceId);
  return connectedToolkits;
}

interface StoredComposioSession {
  sessionId: string;
  /** Sorted priority-toolkit set the session was created with. */
  toolkitsKey: string;
  createdAt: string;
}

function parseStoredSession(context: unknown): StoredComposioSession | null {
  if (!context || typeof context !== "object") return null;
  const raw = (context as Record<string, unknown>).composioSession;
  if (!raw || typeof raw !== "object") return null;
  const session = raw as Record<string, unknown>;
  if (
    typeof session.sessionId !== "string" ||
    typeof session.toolkitsKey !== "string" ||
    typeof session.createdAt !== "string"
  ) {
    return null;
  }
  return {
    sessionId: session.sessionId,
    toolkitsKey: session.toolkitsKey,
    createdAt: session.createdAt,
  };
}

async function readStoredSession(
  conversationId: string,
): Promise<StoredComposioSession | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ask_salt_conversations")
    .select("context")
    .eq("id", conversationId)
    .maybeSingle();
  if (error) {
    console.warn("[ask-salt] failed to read stored session:", error.message);
    return null;
  }
  return parseStoredSession(data?.context);
}

async function persistSession(
  conversationId: string,
  session: StoredComposioSession,
): Promise<void> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ask_salt_conversations")
    .select("context")
    .eq("id", conversationId)
    .maybeSingle();
  const existing =
    data?.context && typeof data.context === "object"
      ? (data.context as Record<string, unknown>)
      : {};
  const { error } = await supabase
    .from("ask_salt_conversations")
    .update({ context: { ...existing, composioSession: session } })
    .eq("id", conversationId);
  if (error) {
    // Non-fatal: worst case the next message creates a fresh session.
    console.warn("[ask-salt] failed to persist session:", error.message);
  }
}

/**
 * Detailed loader for Ask Salt's Composio tools. Returns the connected
 * toolkits, the slugs that survived policy, and any load error so callers can
 * distinguish "not connected", "connected but every tool disabled", and
 * "connected but the session failed" — instead of all three collapsing to {}.
 */
export async function loadAskSaltComposioToolsDetailed(
  workspaceId: string,
  context: AskSaltToolLoadContext = {},
): Promise<AskSaltComposioToolLoad> {
  const [{ connectedToolkits, connectionIdByToolkit }, connectorPolicy] =
    await Promise.all([
      getConnectedToolkitStatuses(workspaceId),
      getWorkspaceConnectorPolicy(workspaceId),
    ]);
  if (connectedToolkits.length === 0) {
    return {
      tools: {},
      connectedToolkits,
      connectionIdByToolkit,
      loadedSlugs: [],
      loadError: null,
    };
  }

  const policyOptions = {
    trustByProvider: connectorPolicy.trustByProvider,
    emailModeByProvider: connectorPolicy.emailModeByProvider,
  };

  // No preload whitelist - load ALL tools from connected toolkits.
  // Filtering happens at wrap time via isAskSaltSlugAllowed() which checks:
  // - Tool classification (read/mutating/destructive)
  // - Trust level per provider
  // - Email mode restrictions

  try {
    const composio = getComposioAgentClient();
    const authConfigByToolkit = new Map(
      (await listAskSaltEntries()).map((entry) => [
        entry.toolkitSlug,
        entry.authConfigId,
      ]),
    );
    const authConfigs = Object.fromEntries(
      connectedToolkits
        .map((toolkit) => [toolkit, authConfigByToolkit.get(toolkit) ?? ""] as const)
        .filter(([, authConfigId]) => authConfigId !== ""),
    );

    // Only load tools for PRIORITY toolkits to stay under context limits.
    // Discovery tools (search_connector_tools + execute_connector_action)
    // handle everything else via on-demand schema lookup.
    const PRIORITY_TOOLKITS = [
      "gmail",
      "googlecalendar",
      "googledrive",
      "stripe",
      "quickbooks",
      "slack",
    ];
    const priorityToolkits = connectedToolkits.filter((t) =>
      PRIORITY_TOOLKITS.includes(t),
    );

    console.log("[ask-salt] loading priority toolkit tools", {
      workspaceId,
      connectedToolkits: connectedToolkits.length,
      priorityToolkits,
    });

    let tools: ToolSet = {};
    if (priorityToolkits.length > 0) {
      const priorityAuthConfigs = Object.fromEntries(
        priorityToolkits
          .map((toolkit) => [toolkit, authConfigs[toolkit]] as const)
          .filter(([, id]) => id),
      );

      // Plan 3.6: reuse the Tool Router session across a conversation.
      // Session creation is the expensive/billed step; `use()` reattaches to
      // the existing session by id. A stale/expired stored session falls back
      // to a fresh create. The toolkit set is part of the key so connecting a
      // new app mid-conversation mints a new session.
      const toolkitsKey = [...priorityToolkits].sort().join(",");
      const stored = context.conversationId
        ? await readStoredSession(context.conversationId)
        : null;

      let session = null;
      if (stored && stored.toolkitsKey === toolkitsKey) {
        try {
          session = await composio.use(stored.sessionId);
        } catch (reuseError) {
          console.warn("[ask-salt] stored session unusable, creating fresh:", {
            conversationId: context.conversationId,
            error:
              reuseError instanceof Error ? reuseError.message : reuseError,
          });
        }
      }
      if (!session) {
        session = await composio.create(workspaceId, {
          toolkits: priorityToolkits,
          authConfigs: priorityAuthConfigs,
          preload: { tools: "all" },
        });
        if (context.conversationId) {
          await persistSession(context.conversationId, {
            sessionId: session.sessionId,
            toolkitsKey,
            createdAt: new Date().toISOString(),
          });
        }
      }

      tools = await session.tools();
      console.log("[ask-salt] priority tools loaded", {
        toolCount: Object.keys(tools).length,
        sessionReused: stored?.toolkitsKey === toolkitsKey,
      });
    }
    const wrapped = wrapComposioToolsForAskSalt(tools, {
      ...policyOptions,
      workspaceId,
      userId: context.userId,
      connectionIdByToolkit,
    });
    const wrappedKeys = Object.keys(wrapped);
    const gmailTools = wrappedKeys.filter((k) => k.toUpperCase().includes("GMAIL"));
    console.log("[ask-salt] tools wrapped", {
      rawCount: Object.keys(tools).length,
      wrappedCount: wrappedKeys.length,
      gmailTools,
      policyOptions,
    });
    return {
      tools: wrapped,
      connectedToolkits,
      connectionIdByToolkit,
      loadedSlugs: wrappedKeys,
      loadError: null,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Composio tool load failed";
    const errorDetails = {
      message,
      name: error instanceof Error ? error.name : typeof error,
      stack: error instanceof Error ? error.stack?.split("\n").slice(0, 5) : undefined,
      response: (error as { response?: { status?: number; data?: unknown } })?.response,
      cause: (error as { cause?: unknown })?.cause,
    };
    console.error("[ask-salt] composio tool load failed", errorDetails);
    return {
      tools: {},
      connectedToolkits,
      connectionIdByToolkit,
      loadedSlugs: [],
      loadError: message,
    };
  }
}

/**
 * Per-app connectors: only toolkits with an active workspace connection are
 * registered, so Salt never offers tools for apps the user hasn't linked.
 * Thin wrapper over {@link loadAskSaltComposioToolsDetailed} for callers that
 * only need the ToolSet.
 */
export async function loadAskSaltComposioTools(
  workspaceId: string,
  context: AskSaltToolLoadContext = {},
): Promise<ToolSet> {
  const { tools } = await loadAskSaltComposioToolsDetailed(workspaceId, context);
  return tools;
}
