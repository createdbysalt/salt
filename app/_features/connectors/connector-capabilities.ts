import { COMPOSIO_TOOL_SLUGS } from "@/app/_lib/composio/tool-slugs";
import { CONNECTOR_CATALOG_BY_ID } from "./connector-catalog";
import type { ConnectorCatalogId } from "./types";

export interface ConnectorCapability {
  id: string;
  label: string;
  description?: string;
  risk: "read" | "write";
  toolSlug?: string;
  nativeAction?: string;
}

export interface ConnectorCapabilityGroups {
  read: ConnectorCapability[];
  write: ConnectorCapability[];
  overviewBullets: string[];
}

const GMAIL_CAPABILITIES: ConnectorCapability[] = [
  {
    id: "gmail-list-messages",
    label: "Search emails",
    description: "Search and read emails in Gmail.",
    risk: "read",
    toolSlug: COMPOSIO_TOOL_SLUGS.GMAIL_LIST_MESSAGES,
  },
  {
    id: "gmail-get-message",
    label: "Open email thread",
    description: "Read a specific message and its thread context.",
    risk: "read",
    toolSlug: COMPOSIO_TOOL_SLUGS.GMAIL_GET_MESSAGE,
  },
  {
    id: "gmail-list-labels",
    label: "List labels",
    description: "See folders and labels for organization.",
    risk: "read",
    toolSlug: COMPOSIO_TOOL_SLUGS.GMAIL_LIST_LABELS,
  },
  {
    id: "gmail-send-email",
    label: "Send an email",
    description: "Send messages on your behalf after you approve.",
    risk: "write",
    toolSlug: COMPOSIO_TOOL_SLUGS.GMAIL_SEND_EMAIL,
  },
];

// Deleting events is destructive-class: Salt can never execute it, so it is
// not offered as a capability or a toggle.
const CALENDAR_CAPABILITIES: ConnectorCapability[] = [
  {
    id: "calendar-list-events",
    label: "Search calendar events",
    description: "Search Google Calendar events and availability.",
    risk: "read",
    toolSlug: COMPOSIO_TOOL_SLUGS.GOOGLECALENDAR_LIST_EVENTS,
  },
  {
    id: "calendar-create-event",
    label: "Create calendar events",
    description: "Add meetings and holds to your calendar.",
    risk: "write",
    toolSlug: COMPOSIO_TOOL_SLUGS.GOOGLECALENDAR_CREATE_EVENT,
  },
  {
    id: "calendar-update-event",
    label: "Update calendar events",
    description: "Change times, titles, or attendees.",
    risk: "write",
    toolSlug: COMPOSIO_TOOL_SLUGS.GOOGLECALENDAR_UPDATE_EVENT,
  },
];

const STRIPE_OVERVIEW: ConnectorCapabilityGroups = {
  read: [
    {
      id: "stripe-payout-status",
      label: "Payout status",
      description: "See whether charges and payouts are enabled",
      risk: "read",
      nativeAction: "stripe.connect.status",
    },
    {
      id: "stripe-balance",
      label: "Balance & history",
      description: "Review payment activity Salt surfaces for you",
      risk: "read",
      nativeAction: "stripe.connect.balance",
    },
  ],
  write: [],
  overviewBullets: [
    "Connect Stripe to accept client payments through Salt.",
    "Salt manages OAuth securely — your keys never live in the browser.",
    "Payout and charge status appear here once onboarding completes.",
  ],
};

function groupCapabilities(
  capabilities: ConnectorCapability[],
  overviewBullets: string[],
): ConnectorCapabilityGroups {
  return {
    read: capabilities.filter((capability) => capability.risk === "read"),
    write: capabilities.filter((capability) => capability.risk === "write"),
    overviewBullets,
  };
}

export function getConnectorCapabilities(
  catalogId: ConnectorCatalogId,
): ConnectorCapabilityGroups | null {
  const definition = CONNECTOR_CATALOG_BY_ID[catalogId];
  if (!definition) {
    return null;
  }

  switch (catalogId) {
    case "google":
      return groupCapabilities(GMAIL_CAPABILITIES, [
        "Search your Gmail inbox so Salt can surface what matters in HQ and Plays.",
        "Read messages and thread context before drafting replies or play steps.",
        "Send email only after you explicitly approve each message.",
        "Salt can never delete or trash your email.",
      ]);
    case "google-calendar":
      return groupCapabilities(CALENDAR_CAPABILITIES, [
        "See calendar events and availability so Salt can prepare scheduling steps.",
        "Create and update meetings only when you approve each action.",
        "Salt can never delete calendar events.",
        "Disable write tools if you only want Salt to read availability.",
        "Connected Gmail before Calendar became its own connector? Connect Calendar here to keep using scheduling tools.",
      ]);
    case "google-drive":
      return {
        read: [],
        write: [],
        overviewBullets: [
          "Google Drive sync is coming soon.",
          "You will choose which folders Salt can read when it launches.",
        ],
      };
    case "stripe":
      return STRIPE_OVERVIEW;
    default:
      return null;
  }
}

/** Composio workspace_integrations.provider for tool enforcement and config storage. */
export function getComposioProviderForToolSlug(toolSlug: string): string | null {
  if (toolSlug.startsWith("GMAIL_")) {
    return "gmail";
  }
  if (toolSlug.startsWith("GOOGLECALENDAR_")) {
    return "googlecalendar";
  }
  if (toolSlug.startsWith("CAL_")) {
    return "calcom";
  }
  if (toolSlug.startsWith("FIREFLIES_")) {
    return "fireflies";
  }
  return null;
}

/** Providers whose disabledTools should be merged for Google-family tools. */
export function getGoogleToolPreferenceProviders(): readonly string[] {
  return ["gmail", "googlecalendar"];
}

export function supportsToolPreferences(catalogId: ConnectorCatalogId): boolean {
  return catalogId === "google" || catalogId === "google-calendar";
}
