import "server-only";

import type { ToolSet } from "ai";
import { getComposioProviderForToolSlug } from "@/app/_features/connectors/connector-capabilities";
import { getWorkspaceConnectorPolicy } from "@/app/_features/connectors/queries";
import { isComposioConfigured, getConnectionStatus } from "./connections";
import { loadAskSaltComposioToolsDetailed } from "./load-ask-salt-tools";
import { ASK_SALT_COMPOSIO_TOOLKITS } from "./ask-salt-tools";
import { getComposioToolPolicy } from "./tool-policy-registry";
import { COMPOSIO_TOOL_SLUGS } from "./tool-slugs";
import { getAskSaltLabels, isRegisteredProvider } from "./unified-connector-registry";
import { EMAIL_PROVIDER_CAPABILITIES } from "./capability-config";

/** Human-facing toolkit labels, derived from the unified connector registry. */
const ASK_SALT_TOOLKIT_LABELS: Record<string, string> = getAskSaltLabels();

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
  return Promise.all(
    ASK_SALT_COMPOSIO_TOOLKITS.map(async (toolkit): Promise<AskSaltConnectionStatus> => {
      if (!isRegisteredProvider(toolkit)) {
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

export interface AskSaltPolicyRestrictions {
  /** Workspace trust level — affects what actions are available. */
  trustLevel: "read_only" | "act_with_approval" | "trust";
  /** Email mode per provider (gmail, outlook) — "draft" blocks sending. */
  emailModeByProvider: Record<string, "draft" | "send">;
  /** True when provider is connected AND in send mode. */
  sendEnabledByProvider: Record<string, boolean>;
  /** User-friendly explanations of what's blocked and how to fix it. */
  blockedCapabilities: string[];
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
  /** Policy restrictions that affect what Ask Salt can do. */
  policyRestrictions: AskSaltPolicyRestrictions;
}

function annotateSlug(slug: string): string {
  const policy = getComposioToolPolicy(slug);
  const name = humanizeSlug(slug);
  const slugHint = `slug ${slug}`;
  if (!policy) return `${name} (${slugHint})`;
  if (policy.risk === "read") return `${name} (read, ${slugHint})`;
  if (slug === COMPOSIO_TOOL_SLUGS.GMAIL_CREATE_DRAFT) return `${name} (draft, ${slugHint})`;
  if (policy.requiresHumanConfirmation) return `${name} (needs approval, ${slugHint})`;
  return `${name} (action, ${slugHint})`;
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
    return {
      composioConfigured,
      composioTools: {},
      providers,
      loadError: null,
      policyRestrictions: {
        trustLevel: "read_only",
        emailModeByProvider: { gmail: "draft", outlook: "draft" },
        sendEnabledByProvider: { gmail: false, outlook: false },
        blockedCapabilities: ["Connector tools are unavailable (server configuration issue)."],
      },
    };
  }

  const load = await loadAskSaltComposioToolsDetailed(workspaceId, { userId });

  // Two-stage exposure (5.5.2): discovery + generic gated executor on top of
  // the pinned preload. Built from connection state alone, so it works even
  // when the Composio session load failed.
  const { buildConnectorDiscoveryTools } = await import(
    "@/app/_features/ask-salt/connector-discovery-tools"
  );
  const connectorPolicy = await getWorkspaceConnectorPolicy(workspaceId);
  const discoveryTools = buildConnectorDiscoveryTools({
    workspaceId,
    userId,
    connectedToolkits: load.connectedToolkits,
    connectionIdByToolkit: load.connectionIdByToolkit,
    disabledTools: connectorPolicy.disabledTools,
  });

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

  // Build policy restrictions with user-friendly explanations
  const blockedCapabilities: string[] = [];
  const trustLevel = Object.values(connectorPolicy.trustByProvider)[0] ?? "read_only";
  const emailModeByProvider = connectorPolicy.emailModeByProvider;

  // Check email provider restrictions - uses centralized capability config
  const sendEnabledByProvider: Record<string, boolean> = {};

  for (const { provider: key, label } of EMAIL_PROVIDER_CAPABILITIES) {
    const connected = statuses.some((s) => s.toolkit === key && s.connected);
    const mode = emailModeByProvider[key] ?? "draft";
    sendEnabledByProvider[key] = connected && mode === "send";

    if (connected && mode === "draft") {
      blockedCapabilities.push(
        `${label} is in Draft mode — I can create email drafts but cannot send them directly. ` +
        `To enable sending, go to Settings → Connectors → ${label} and change Email Mode to 'Send'.`
      );
    }
  }

  // Check trust level restrictions
  if (trustLevel === "read_only") {
    const connectedApps = statuses.filter((s) => s.connected).map((s) => s.label);
    if (connectedApps.length > 0) {
      blockedCapabilities.push(
        `Salt is in Read-only mode — I can read from ${connectedApps.join(", ")} but cannot take actions. ` +
        "To enable actions, go to Settings → Plays and change permissions to 'Ask' or 'Trust'."
      );
    }
  }

  return {
    composioConfigured,
    composioTools: { ...load.tools, ...discoveryTools },
    providers,
    loadError: load.loadError,
    policyRestrictions: {
      trustLevel: trustLevel as AskSaltPolicyRestrictions["trustLevel"],
      emailModeByProvider,
      sendEnabledByProvider,
      blockedCapabilities,
    },
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
        // #region agent log
        if (provider.toolkit === "googledocs") {
          fetch("http://127.0.0.1:7443/ingest/a7cd7781-629e-483f-bcc8-d958046d0b66", {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "0970b2" },
            body: JSON.stringify({
              sessionId: "0970b2",
              runId: "pre-fix",
              hypothesisId: "H1-H4",
              location: "app/_lib/composio/ask-salt-capabilities.ts:buildAskSaltCapabilityBlock",
              message: "Google Docs capability prompt vs registered slugs",
              data: {
                loadedSlugs: provider.loadedSlugs,
                humanizedTools: provider.loadedSlugs.map(annotateSlug),
                capabilityLine: `- ${provider.label}${who}: ${tools}`,
              },
              timestamp: Date.now(),
            }),
          }).catch(() => {});
        }
        // #endregion
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

  // Add policy restriction explanations so the model can explain what's blocked
  if (capabilities.policyRestrictions.blockedCapabilities.length > 0) {
    lines.push("");
    lines.push("Policy restrictions (explain these to users when relevant):");
    for (const restriction of capabilities.policyRestrictions.blockedCapabilities) {
      lines.push(`- ${restriction}`);
    }
  }

  // Email provider instructions - generate for each connected email provider
  // Uses centralized capability config so new providers are automatic
  for (const { provider: key, label, sendTool, draftTool } of EMAIL_PROVIDER_CAPABILITIES) {
    const provider = capabilities.providers.find((p) => p.toolkit === key);
    if (provider?.connected) {
      lines.push("");
      const sendEnabled = capabilities.policyRestrictions.sendEnabledByProvider[key];
      const sendToolLoaded = provider.loadedSlugs.includes(sendTool);
      const draftToolLoaded = provider.loadedSlugs.includes(draftTool);

      if (sendEnabled && sendToolLoaded) {
        lines.push(`${label.toUpperCase()} INSTRUCTIONS (Send Mode ENABLED):`);
        lines.push(`- DEFAULT: Use ${sendTool} for ALL email requests unless user explicitly says 'draft'`);
        lines.push(`- User says 'send', 'email', 'send an email', 'send email to' → use ${sendTool}`);
        lines.push(`- User says 'draft', 'create draft', 'save as draft' → use ${draftTool}`);
        lines.push(`- NEVER use ${draftTool} when user says 'send' - that's the wrong tool`);
        lines.push(`- The ${sendTool} tool requires approval before executing`);
      } else if (sendEnabled && !sendToolLoaded) {
        // Send mode is enabled but send tool isn't loaded - likely trust level issue
        lines.push(`${label.toUpperCase()} INSTRUCTIONS (Send Mode ENABLED but blocked):`);
        lines.push(`- Email send mode is ON, but ${sendTool} is blocked by workspace trust level`);
        lines.push(`- User needs to change Settings → Plays permission to 'Ask' or 'Trust' to enable send`);
        lines.push(`- For now, use ${draftTool} and tell the user to check their Plays permission setting`);
      } else {
        lines.push(`${label.toUpperCase()} INSTRUCTIONS (Draft Mode - send is disabled):`);
        lines.push(`- All email requests create drafts via ${draftTool}`);
        lines.push(`- ${sendTool} is not available in draft mode`);
        lines.push(`- Tell the user the email is in their ${label} Drafts folder for review`);
      }
    }
  }

  // Troubleshooting guidance for missing tools
  lines.push("");
  lines.push("TROUBLESHOOTING — If a user asks why a specific tool isn't working:");
  lines.push("1. **Not connected**: The app isn't linked yet → Settings → Connectors to connect it.");
  lines.push("2. **Read-only mode**: Mutating tools (send, create, update) are blocked → Settings → Plays to change permission to 'Ask' or 'Trust'. This is a WORKSPACE setting, not per-connector.");
  lines.push("3. **Draft mode (email)**: Send tools are blocked → Settings → Connectors → [Gmail/Outlook] to enable Send mode.");
  lines.push("4. **Tool disabled**: Specific tool turned off → Settings → Connectors → [App] → Tools section.");
  lines.push("5. **Destructive action**: DELETE operations are always blocked for safety — no setting to enable.");
  lines.push("6. **Load error**: Temporary API issue → try again in a moment.");
  lines.push("IMPORTANT: Permission level (Read/Ask/Trust) is in Settings → Plays. Email mode (Draft/Send) is in Settings → Connectors → Gmail.");

  lines.push("");
  lines.push(
    "Only the tools listed above are available this turn. Never claim a listed tool is unavailable, and never claim a connected app is disconnected. If a request needs a tool that is not listed, explain which policy restriction applies and how the user can change it in Settings.",
  );

  return lines.join("\n");
}
