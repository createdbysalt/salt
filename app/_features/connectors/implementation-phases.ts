/**
 * Composio connector rollout phases aligned with the approved plan.
 * Used for tests and future feature flags — not user-facing copy.
 */
export const CONNECTOR_IMPLEMENTATION_PHASES = [
  {
    id: "policy",
    label: "Finalize connector policy",
    status: "complete",
  },
  {
    id: "auth",
    label: "Harden Composio OAuth state and workspace membership checks",
    status: "complete",
  },
  {
    id: "database",
    label: "Persist connector state in workspace_integrations",
    status: "complete",
  },
  {
    id: "registry",
    label: "Normalize connector catalog registry",
    status: "complete",
  },
  {
    id: "ui",
    label: "Perplexity-style connectors catalog UI",
    status: "complete",
  },
  {
    id: "gmail-calendar",
    label: "Composio-backed Gmail/Calendar connection flows",
    status: "complete",
  },
  {
    id: "detail-modal",
    label: "Connector detail modal and per-workspace tool preferences",
    status: "complete",
  },
  {
    id: "tests",
    label: "OAuth, allowlist, and catalog tests",
    status: "complete",
  },
] as const;

export type ConnectorImplementationPhase =
  (typeof CONNECTOR_IMPLEMENTATION_PHASES)[number]["id"];
