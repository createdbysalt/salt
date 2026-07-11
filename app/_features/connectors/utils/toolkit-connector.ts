import type { ConnectorCatalogId } from "../types";

export interface ToolkitConnectorRef {
  id: ConnectorCatalogId;
  label: string;
}

/** Composio toolkit slug → connector catalog id (when they differ). */
const TOOLKIT_CONNECTOR_MAP: Record<string, ToolkitConnectorRef> = {
  gmail: { id: "google", label: "Gmail" },
  googlecalendar: { id: "google-calendar", label: "Google Calendar" },
  googledrive: { id: "google-drive", label: "Google Drive" },
  googledocs: { id: "google-docs", label: "Google Docs" },
  googlesheets: { id: "google-sheets", label: "Google Sheets" },
  googleslides: { id: "google-slides", label: "Google Slides" },
  slack: { id: "slack", label: "Slack" },
  notion: { id: "notion", label: "Notion" },
  stripe: { id: "stripe", label: "Stripe" },
  quickbooks: { id: "quickbooks", label: "QuickBooks" },
  clickup: { id: "clickup", label: "ClickUp" },
  asana: { id: "asana", label: "Asana" },
  hubspot: { id: "hubspot", label: "HubSpot" },
  linear: { id: "linear", label: "Linear" },
  zoom: { id: "zoom", label: "Zoom" },
};

function humanizeToolkitSlug(slug: string): string {
  return slug
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function connectorForToolkit(toolkit: string): ToolkitConnectorRef | null {
  const normalized = toolkit.trim().toLowerCase();
  if (!normalized) return null;

  const mapped = TOOLKIT_CONNECTOR_MAP[normalized];
  if (mapped) return mapped;

  return {
    id: normalized as ConnectorCatalogId,
    label: humanizeToolkitSlug(normalized),
  };
}

export function connectorsForToolkits(toolkits: readonly string[]): ToolkitConnectorRef[] {
  const seen = new Set<string>();

  return toolkits
    .map((toolkit) => connectorForToolkit(toolkit))
    .filter((entry): entry is ToolkitConnectorRef => entry !== null)
    .filter((entry) => {
      if (seen.has(entry.id)) return false;
      seen.add(entry.id);
      return true;
    });
}
