import "server-only";

import type { ToolSet } from "ai";
import { getComposioProviderForToolSlug } from "@/app/_features/connectors/connector-capabilities";
import { isComposioConfigured, getConnectionStatus } from "./connections";
import { loadAskSaltComposioToolsDetailed } from "./load-ask-salt-tools";
import { ASK_SALT_COMPOSIO_TOOLKITS } from "./ask-salt-tools";
import { getComposioToolPolicy } from "./tool-policy-registry";
import { COMPOSIO_TOOL_SLUGS } from "./tool-slugs";
import { getConnectorRegistry } from "./connector-registry";
import { askSaltManifestLabels } from "./connector-manifest";

/** Human-facing toolkit labels, derived from the connector manifest. */
const ASK_SALT_TOOLKIT_LABELS: Record<string, string> = askSaltManifestLabels();

function toolkitLabel(toolkit: string): string {
  return ASK_SALT_TOOLKIT_LABELS[toolkit] ?? toolkit;
}

/** slug (real Composio value) → Salt semantic key, for readable tool names. */
const SLUG_TO_SEMANTIC_NAME: Record<string, string> = Object.fromEntries(
  Object.entries(COMPOSIO_TOOL_SLUGS).map(([key, slug]) => [slug, key]),
);

function humanizeSlug(slug: string): string {
  const semantic = SLUG_TO_SEMANTIC_NAME[slug] ?? slug;
  return semantic
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .join(" ");
}

export interface AskSaltConnectionStatus {
  toolkit: string;
  label: string;
  connected: boolean;
  email: string | null;
}

/**
 * Per-toolkit connection truth for every app Ask Salt supports, read from the
 * same `getConnectionStatus` source as the connector UI (`getConnectorsPageData`).
 * Centralizing this is what keeps the deterministic connector path and the LLM
 * chat from ever disagreeing about whether an app is connected.
 */
export async function getAskSaltConnectionStatuses(
  workspaceId: string,
): Promise<AskSaltConnectionStatus[]> {
  const registry = await getConnectorRegistry();
  return Promise.all(
    ASK_SALT_COMPOSIO_TOOLKITS.map(async (toolkit): Promise<AskSaltConnectionStatus> => {
      if (!registry.has(toolkit)) {
        return { toolkit, label: toolkitLabel(toolkit), connected: false, email: null };
      }
      const status = await getConnectionStatus(toolkit, workspaceId);
      return {
        toolkit,
        label: toolkitLabel(toolkit),
        connected: status.connected,
        email: status.email,
      };
    }),
  );
}

export type AskSaltProviderDiagnostic =
  | "not_connected"
  | "available"
  | "connected_no_tools"
  | "load_failed"
  /** Workspace has the app linked, but COMPOSIO_API_KEY is missing so tools cannot load. */
  | "integration_api_offline";

export interface AskSaltProviderCapability {
  toolkit: string;
  label: string;
  connected: boolean;
  email: string | null;
  /** Loaded tool slugs for this provider, after policy filtering. */
  loadedSlugs: string[];
  diagnostic: AskSaltProviderDiagnostic;
}

export interface AskSaltCapabilities {
  /** True when COMPOSIO_API_KEY is present so connectors can load at all. */
  composioConfigured: boolean;
  /** The wrapped, policy-enforced Composio ToolSet for this turn. */
  composioTools: ToolSet;
  /** Per-provider connection + tool availability. */
  providers: AskSaltProviderCapability[];
  /** Set when the Composio session/tool fetch threw for connected toolkits. */
  loadError: string | null;
}

function annotateSlug(slug: string): string {
  const policy = getComposioToolPolicy(slug);
  const name = humanizeSlug(slug);
  if (!policy) return name;
  if (policy.risk === "read") return `${name} (read)`;
  if (slug === COMPOSIO_TOOL_SLUGS.GMAIL_CREATE_DRAFT) return `${name} (draft)`;
  if (policy.requiresHumanConfirmation) return `${name} (needs approval)`;
  return `${name} (action)`;
}

/**
 * Single source of truth for what Ask Salt can do this turn: connection state
 * for every supported toolkit, the loaded ToolSet, and per-provider
 * diagnostics that explain a connected-but-unavailable app. Both the chat
 * route and the deterministic connector path read from this so they can never
 * contradict each other.
 */
export async function resolveAskSaltCapabilities(
  workspaceId: string,
  userId?: string,
): Promise<AskSaltCapabilities> {
  const composioConfigured = isComposioConfigured();

  // Always read workspace connection truth from the DB — even when the Composio
  // API key is missing — so Ask Salt never tells the user "nothing is connected"
  // when Gmail/Calendar are linked in Connections.
  const statuses = await getAskSaltConnectionStatuses(workspaceId);

  if (!composioConfigured) {
    const providers: AskSaltProviderCapability[] = statuses.map((status) => ({
      toolkit: status.toolkit,
      label: status.label,
      connected: status.connected,
      email: status.email,
      loadedSlugs: [],
      diagnostic: status.connected ? "integration_api_offline" : "not_connected",
    }));
    return { composioConfigured, composioTools: {}, providers, loadError: null };
  }

  const load = await loadAskSaltComposioToolsDetailed(workspaceId, { userId });

  const slugsByProvider = new Map<string, string[]>();
  for (const slug of load.loadedSlugs) {
    const provider = getComposioProviderForToolSlug(slug);
    if (!provider) continue;
    const list = slugsByProvider.get(provider) ?? [];
    list.push(slug);
    slugsByProvider.set(provider, list);
  }

  const providers: AskSaltProviderCapability[] = statuses.map((status) => {
    const loadedSlugs = slugsByProvider.get(status.toolkit) ?? [];
    let diagnostic: AskSaltProviderDiagnostic;
    if (!status.connected) {
      diagnostic = "not_connected";
    } else if (loadedSlugs.length > 0) {
      diagnostic = "available";
    } else if (load.loadError) {
      diagnostic = "load_failed";
    } else {
      diagnostic = "connected_no_tools";
    }
    return {
      toolkit: status.toolkit,
      label: status.label,
      connected: status.connected,
      email: status.email,
      loadedSlugs,
      diagnostic,
    };
  });

  return {
    composioConfigured,
    composioTools: load.tools,
    providers,
    loadError: load.loadError,
  };
}

/**
 * Render the live capability state as a model-facing system-prompt block.
 * Derived entirely from the resolved capabilities + policy registry, so new
 * toolkits/tools appear automatically with no prompt edits.
 */
export function buildAskSaltCapabilityBlock(capabilities: AskSaltCapabilities): string {
  const lines: string[] = ["Current capabilities (this turn — authoritative):"];

  lines.push(
    "- Memory tools (people, organizations, work, links, notes) are always available.",
  );

  const connectedOffline = capabilities.providers.filter(
    (p) => p.diagnostic === "integration_api_offline",
  );

  if (!capabilities.composioConfigured) {
    if (connectedOffline.length > 0) {
      const linked = connectedOffline
        .map((p) => (p.email ? `${p.label} (${p.email})` : p.label))
        .join(", ");
      lines.push(
        `- These apps ARE connected in the user's workspace: ${linked}. The integration API key is not loaded on this server, so their read/write tools are unavailable this turn — this is a server restart issue (pnpm dev:op), NOT missing user connections. Never tell the user they have no connected apps when listed here.`,
      );
    } else {
      lines.push(
        "- Connector tools are unavailable on this server (no Composio API key). If the user says an app is connected, believe them and explain the server needs pnpm dev:op — do not insist nothing is linked.",
      );
    }
    lines.push(
      "- External connector scans cannot run this turn. For add-person requests, still search Memory (memory_find_people, memory_find_orgs) for existing records and any capture-derived context Salt already has.",
    );
    lines.push(
      "Only the tools listed above are available this turn. Never claim a connected app listed above is disconnected.",
    );
    return lines.join("\n");
  }

  for (const provider of capabilities.providers) {
    switch (provider.diagnostic) {
      case "available": {
        const who = provider.email ? ` (connected as ${provider.email})` : " (connected)";
        const tools = provider.loadedSlugs.map(annotateSlug).join(", ");
        lines.push(`- ${provider.label}${who}: ${tools}`);
        break;
      }
      case "connected_no_tools":
        lines.push(
          `- ${provider.label} is connected, but no tools are enabled for it right now (read-only or disabled in connector settings). Tell the user to adjust permissions in the connector's settings rather than reconnecting.`,
        );
        break;
      case "load_failed":
        lines.push(
          `- ${provider.label} is connected, but its tools could not be loaded this turn due to a temporary error. Tell the user to try again shortly — do not say it is disconnected.`,
        );
        break;
      case "integration_api_offline":
        lines.push(
          `- ${provider.label} is connected in the workspace${provider.email ? ` as ${provider.email}` : ""}, but tools are offline on this server (missing Composio API key). Do not say it is disconnected.`,
        );
        break;
      case "not_connected":
        lines.push(
          `- ${provider.label} is not connected. If the user needs it, offer to connect it (they can say "Connect ${provider.label}").`,
        );
        break;
    }
  }

  lines.push(
    "Only the tools listed above are available this turn. Never claim a listed tool is unavailable, and never claim a connected app is disconnected. If a request needs a tool that is not listed, say which app must be connected or enabled and offer to connect it.",
  );

  return lines.join("\n");
}
