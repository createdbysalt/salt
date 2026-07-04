import "server-only";

import { disconnectGmail } from "@/app/_features/connectors/actions/gmail/disconnect";
import { disconnectGoogleCalendar } from "@/app/_features/connectors/actions/calendar/connect";
import { connectorsPageUrl } from "@/app/_features/connectors/constants";
import { getConnectorsPageData } from "@/app/_features/connectors/queries";
import type {
  ConnectorCatalogId,
  ConnectorDefinition,
} from "@/app/_features/connectors/types";
import { connectorPayloadToInline } from "./inline-connect";
import type { ConnectorTarget } from "./router";
import type {
  AskSaltConnectorTurnResult,
  ConnectorCardPayload,
  InlineConnectAction,
} from "./types";

// Connection truth here flows from getConnectorsPageData -> getConnectionStatus,
// the same source resolveAskSaltCapabilities reads for the LLM chat. Keep it
// that way: the deterministic connector turns and the model's capability block
// must never compute "connected" from different places, or they will contradict.
// The catalog itself rides in pageData (DB-driven, connector-platform 2.5).
type ConnectorsPageDataResult = Awaited<ReturnType<typeof getConnectorsPageData>>;

function catalogEntry(
  pageData: ConnectorsPageDataResult,
  connectorId: ConnectorCatalogId,
): ConnectorDefinition | null {
  return pageData.catalog.find((entry) => entry.id === connectorId) ?? null;
}

function catalogEntryForTarget(
  pageData: ConnectorsPageDataResult,
  target: ConnectorTarget,
) {
  // Per-app connectors: Gmail and Google Calendar are separate entries.
  if (target === "google") {
    return catalogEntry(pageData, "google");
  }
  if (target === "google-calendar") {
    return catalogEntry(pageData, "google-calendar");
  }
  if (target === "stripe") {
    return catalogEntry(pageData, "stripe");
  }
  return null;
}

function cardFromCatalog(
  entry: ConnectorDefinition,
  status: { connected: boolean; label?: string | null },
  overrides?: Partial<ConnectorCardPayload>,
): ConnectorCardPayload {
  return {
    connectorId: entry.id,
    name: entry.name,
    description: entry.description,
    connected: status.connected,
    statusLabel: status.label ?? undefined,
    ownership: entry.ownership,
    comingSoon: entry.comingSoon ?? false,
    nativeBadge: entry.nativeBadge,
    ...overrides,
  };
}

function connectorCard(
  pageData: ConnectorsPageDataResult,
  connectorId: "google" | "google-calendar",
  overrides?: Partial<ConnectorCardPayload>,
): ConnectorCardPayload | null {
  const entry = catalogEntry(pageData, connectorId);
  if (!entry) return null;
  return cardFromCatalog(
    entry,
    pageData.connectors[connectorId] ?? { connected: false },
    overrides,
  );
}

/** First Google-family connector that still needs connecting, if any. */
function nextUnconnectedGoogleCard(
  pageData: ConnectorsPageDataResult,
): ConnectorCardPayload | null {
  const gmail = connectorCard(pageData, "google");
  if (gmail && !gmail.connected) return gmail;
  const calendar = connectorCard(pageData, "google-calendar");
  if (calendar && !calendar.connected) return calendar;
  return null;
}

function inlineFromCard(
  card: ConnectorCardPayload,
): InlineConnectAction {
  return connectorPayloadToInline(card);
}

export async function buildConnectCatalogTurn(): Promise<AskSaltConnectorTurnResult> {
  const pageData = await getConnectorsPageData();
  const nextCard = nextUnconnectedGoogleCard(pageData);

  return {
    kind: "connector",
    assistantMessage:
      "Salt asks for connections when a Play or question needs them — you don't have to hunt for settings. Gmail covers email, Google Calendar covers scheduling; everything else lives in Connectors.",
    showBrowseConnectors: true,
    inlineAction: nextCard ? inlineFromCard(nextCard) : null,
    suggestions: nextCard
      ? [`Connect ${nextCard.name}`, "Create a new Play"]
      : ["Create a new Play", "Search Memory"],
  };
}

export async function buildConnectionStatusTurn(): Promise<AskSaltConnectorTurnResult> {
  const pageData = await getConnectorsPageData();
  const connected = pageData.catalog.filter(
    (entry) => pageData.connectors[entry.id]?.connected,
  );

  if (connected.length === 0) {
    const gmail = connectorCard(pageData, "google");
    return {
      kind: "connector",
      assistantMessage:
        "Nothing's linked yet. When you build a Play that sends email or checks your calendar, I'll ask you to connect Gmail or Google Calendar right here.",
      inlineAction: gmail ? inlineFromCard(gmail) : null,
      showBrowseConnectors: true,
      suggestions: ["Connect Gmail", "Create a new Play"],
    };
  }

  const labels = connected.map((entry) => {
    const status = pageData.connectors[entry.id];
    return status?.label ? `${entry.name} (${status.label})` : entry.name;
  });

  const nextCard = nextUnconnectedGoogleCard(pageData);

  return {
    kind: "connector",
    assistantMessage: `You're set up with ${labels.join(" and ")}. Tell me what you want to do next.`,
    inlineAction: nextCard ? inlineFromCard(nextCard) : null,
    showBrowseConnectors: false,
    suggestions: ["Create a new Play", "List my recent emails"],
  };
}

export async function handleConnectIntent(
  target: ConnectorTarget,
): Promise<AskSaltConnectorTurnResult> {
  const pageData = await getConnectorsPageData();

  if (target === "stripe") {
    const entry = catalogEntry(pageData, "stripe");
    if (!entry) {
      return buildConnectCatalogTurn();
    }
    const card = cardFromCatalog(
      entry,
      pageData.connectors.stripe ?? { connected: false },
    );
    return {
      kind: "connector",
      assistantMessage:
        "Stripe payouts are set up in Connectors — Salt keeps that secure. Open Connectors when you're ready to finish payout setup.",
      inlineAction: inlineFromCard(card),
      showBrowseConnectors: true,
      suggestions: ["Open Connectors", "Create a new Play"],
    };
  }

  if (target === "unknown") {
    const nextCard = nextUnconnectedGoogleCard(pageData);
    return {
      kind: "connector",
      assistantMessage:
        "Tell me what you're trying to do — I'll only ask for a connection when the Play or question needs it. Gmail handles email and Google Calendar handles scheduling.",
      inlineAction: nextCard ? inlineFromCard(nextCard) : null,
      showBrowseConnectors: true,
      suggestions: nextCard
        ? [`Connect ${nextCard.name}`, "Create a new Play"]
        : ["Create a new Play", "Search Memory"],
    };
  }

  const entry = catalogEntryForTarget(pageData, target);
  if (!entry) {
    return buildConnectCatalogTurn();
  }

  const status = pageData.connectors[entry.id] ?? { connected: false };
  const card = cardFromCatalog(entry, status);

  if (status.connected) {
    return {
      kind: "connector",
      assistantMessage: `${entry.name} is already connected${status.label ? ` as ${status.label}` : ""}. Ask me to ${
        target === "google-calendar"
          ? "check your availability or schedule a meeting"
          : "check email or draft a reply"
      }, or help build a Play that uses it.`,
      inlineAction: inlineFromCard(card),
      suggestions:
        target === "google-calendar"
          ? ["What's on my calendar today?", "Create a new Play"]
          : ["List my recent emails", "Create a new Play"],
    };
  }

  if (entry.comingSoon) {
    return {
      kind: "connector",
      assistantMessage: `${entry.name} is coming soon. Gmail and Google Calendar are available today — connect them when a Play needs email or scheduling.`,
      inlineAction: inlineFromCard(card),
      showBrowseConnectors: true,
      suggestions: ["Connect Gmail", "Browse connectors"],
    };
  }

  if (entry.ownership === "composio") {
    return {
      kind: "connector",
      assistantMessage:
        target === "google-calendar"
          ? "I'll need Google Calendar for this. Connect it once — Salt will use it whenever a Play or question needs scheduling, and only acts with your approval."
          : "I'll need Gmail for this. Connect it once — Salt will use it whenever a Play or question needs email, and sends only with your approval.",
      inlineAction: inlineFromCard(card),
      suggestions: [`Connect ${entry.name}`, "Create a new Play"],
    };
  }

  return buildConnectCatalogTurn();
}

export async function handleDisconnectIntent(
  target: ConnectorTarget,
): Promise<AskSaltConnectorTurnResult> {
  if (target !== "google" && target !== "google-calendar") {
    return {
      kind: "connector",
      assistantMessage:
        target === "unknown"
          ? "Which connection do you want to remove? Gmail and Google Calendar can be disconnected right here; everything else is managed in Connectors."
          : "That connection is managed in Connectors. Open it there for Stripe and other native integrations.",
      showBrowseConnectors: true,
      suggestions:
        target === "unknown"
          ? ["Disconnect Gmail", "Disconnect Google Calendar"]
          : ["Open Connectors"],
    };
  }

  const connectorId = target;
  const pageData = await getConnectorsPageData();
  const card = connectorCard(pageData, connectorId);
  if (!card) {
    return buildConnectCatalogTurn();
  }
  const result =
    connectorId === "google"
      ? await disconnectGmail()
      : await disconnectGoogleCalendar();

  if (!result.success) {
    return {
      kind: "connector",
      assistantMessage: result.error ?? `Could not disconnect ${card.name}.`,
      inlineAction: inlineFromCard({ ...card, error: result.error }),
    };
  }

  const refreshed = await getConnectorsPageData();
  const disconnected = connectorCard(refreshed, connectorId);

  return {
    kind: "connector",
    assistantMessage: `${card.name} is disconnected. I'll ask again when a Play or question needs it.`,
    inlineAction: inlineFromCard(disconnected ?? { ...card, connected: false }),
    suggestions: [`Connect ${card.name}`, "Create a new Play"],
  };
}

export function connectorsFallbackUrl(): string {
  return connectorsPageUrl({ askSalt: "1" });
}
