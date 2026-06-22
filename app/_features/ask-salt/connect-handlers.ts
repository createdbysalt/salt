import "server-only";

import { disconnectGmail } from "@/app/_features/connectors/actions/gmail/disconnect";
import { disconnectGoogleCalendar } from "@/app/_features/connectors/actions/calendar/connect";
import {
  CONNECTOR_CATALOG,
  getCatalogConnectors,
} from "@/app/_features/connectors/connector-catalog";
import { connectorsPageUrl } from "@/app/_features/connectors/constants";
import { getConnectorsPageData } from "@/app/_features/connectors/queries";
import type { ConnectorCatalogId } from "@/app/_features/connectors/types";
import { connectorPayloadToInline } from "./inline-connect";
import type { ConnectorTarget } from "./router";
import type {
  AskSaltConnectorTurnResult,
  ConnectorCardPayload,
  InlineConnectAction,
} from "./types";

const CONNECTOR_CATALOG_BY_ID = Object.fromEntries(
  CONNECTOR_CATALOG.map((entry) => [entry.id, entry]),
) as Record<ConnectorCatalogId, (typeof CONNECTOR_CATALOG)[number]>;

function catalogEntryForTarget(target: ConnectorTarget) {
  // Per-app connectors: Gmail and Google Calendar are separate entries.
  if (target === "google") {
    return CONNECTOR_CATALOG_BY_ID.google;
  }
  if (target === "google-calendar") {
    return CONNECTOR_CATALOG_BY_ID["google-calendar"];
  }
  if (target === "stripe") {
    return CONNECTOR_CATALOG_BY_ID.stripe;
  }
  return null;
}

function cardFromCatalog(
  entry: (typeof CONNECTOR_CATALOG)[number],
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
  pageData: Awaited<ReturnType<typeof getConnectorsPageData>>,
  connectorId: "google" | "google-calendar",
  overrides?: Partial<ConnectorCardPayload>,
): ConnectorCardPayload {
  const entry = CONNECTOR_CATALOG_BY_ID[connectorId];
  return cardFromCatalog(
    entry,
    pageData.connectors[connectorId] ?? { connected: false },
    overrides,
  );
}

/** First Google-family connector that still needs connecting, if any. */
function nextUnconnectedGoogleCard(
  pageData: Awaited<ReturnType<typeof getConnectorsPageData>>,
): ConnectorCardPayload | null {
  const gmail = connectorCard(pageData, "google");
  if (!gmail.connected) return gmail;
  const calendar = connectorCard(pageData, "google-calendar");
  if (!calendar.connected) return calendar;
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
  const entries = getCatalogConnectors();
  const connected = entries.filter(
    (entry) => pageData.connectors[entry.id]?.connected,
  );

  if (connected.length === 0) {
    const gmail = connectorCard(pageData, "google");
    return {
      kind: "connector",
      assistantMessage:
        "Nothing's linked yet. When you build a Play that sends email or checks your calendar, I'll ask you to connect Gmail or Google Calendar right here.",
      inlineAction: inlineFromCard(gmail),
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
    const entry = CONNECTOR_CATALOG_BY_ID.stripe;
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

  const entry = catalogEntryForTarget(target);
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
    inlineAction: inlineFromCard(disconnected),
    suggestions: [`Connect ${card.name}`, "Create a new Play"],
  };
}

export function connectorsFallbackUrl(): string {
  return connectorsPageUrl({ askSalt: "1" });
}
