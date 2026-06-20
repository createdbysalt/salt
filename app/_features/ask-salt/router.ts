/**
 * Pure intent classification for Ask Salt connector flows.
 * Tool read/mutate intents are handled by the AI SDK chat route.
 */

export type AskSaltIntent =
  | "connect"
  | "connector_status"
  | "connector_disconnect"
  | "connect_catalog"
  | "tool_chat";

export type ConnectorTarget =
  | "google"
  | "google-calendar"
  | "stripe"
  | "unknown";

const CONNECT_PATTERNS = [
  /\bconnect\b/i,
  /\blink\b/i,
  /\bset up\b/i,
  /\bsetup\b/i,
  /\bintegrate\b/i,
  /\badd\b.+\b(account|integration|connector|tool)\b/i,
];

const DISCONNECT_PATTERNS = [
  /\bdisconnect\b/i,
  /\bremove\b.+\b(connection|integration|account|connector)\b/i,
  /\bunlink\b/i,
];

const STATUS_PATTERNS = [
  /\bwhat(?:'s| is) connected\b/i,
  /\bwhich\b.+\b(connected|integrations)\b/i,
  /\bconnection status\b/i,
  /\bshow\b.+\b(connections|integrations|connectors)\b/i,
  /\blist\b.+\b(connections|integrations|connectors)\b/i,
];

const CATALOG_PATTERNS = [
  /^connect a tool$/i,
  /\bconnect a tool\b/i,
  /\bavailable (tools|connectors|integrations)\b/i,
  /\bwhat can i connect\b/i,
];

const GOOGLE_PATTERNS = [
  /\bgoogle\b/i,
  /\bgmail\b/i,
  /\bcalendar\b/i,
  /\bgoogle calendar\b/i,
];

const STRIPE_PATTERNS = [/\bstripe\b/i, /\bpayments?\b/i, /\bpayout\b/i];

export function resolveConnectorTarget(prompt: string): ConnectorTarget {
  const lower = prompt.toLowerCase();
  if (STRIPE_PATTERNS.some((p) => p.test(lower)) && !GOOGLE_PATTERNS.some((p) => p.test(lower))) {
    return "stripe";
  }
  if (GOOGLE_PATTERNS.some((p) => p.test(lower))) {
    // Per-app connectors: "calendar" routes to Google Calendar unless the
    // user explicitly mentioned Gmail.
    if (/\bcalendar\b/i.test(lower) && !/\bgmail\b/i.test(lower)) {
      return "google-calendar";
    }
    return "google";
  }
  return "unknown";
}

export function classifyAskSaltIntent(prompt: string): AskSaltIntent {
  const trimmed = prompt.trim();
  if (!trimmed) return "tool_chat";

  if (CATALOG_PATTERNS.some((p) => p.test(trimmed))) {
    return "connect_catalog";
  }

  if (STATUS_PATTERNS.some((p) => p.test(trimmed))) {
    return "connector_status";
  }

  if (DISCONNECT_PATTERNS.some((p) => p.test(trimmed))) {
    return "connector_disconnect";
  }

  if (CONNECT_PATTERNS.some((p) => p.test(trimmed))) {
    return "connect";
  }

  return "tool_chat";
}

export function isConnectorIntent(intent: AskSaltIntent): boolean {
  return (
    intent === "connect" ||
    intent === "connector_status" ||
    intent === "connector_disconnect" ||
    intent === "connect_catalog"
  );
}
