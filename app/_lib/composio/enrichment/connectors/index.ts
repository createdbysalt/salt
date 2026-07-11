import type { ConnectorManifest } from "../config";
import { stripeManifest } from "./stripe";
import { gmailManifest } from "./gmail";
import { googleCalendarManifest } from "./google-calendar";
import { googleDriveManifest } from "./google-drive";
import { hubspotManifest } from "./hubspot";
import { linearManifest } from "./linear";
import { zoomManifest } from "./zoom";
import { slackManifest } from "./slack";
import { notionManifest } from "./notion";
import { quickbooksManifest } from "./quickbooks";

/**
 * Connector manifest registry.
 * Add new connector manifests here to enable config-driven extraction.
 *
 * Current connectors: 10
 * - stripe (billing)
 * - gmail (email)
 * - googlecalendar (calendar)
 * - googledrive (storage)
 * - hubspot (crm)
 * - linear (project_management)
 * - zoom (meetings)
 * - slack (email/messaging)
 * - notion (documents)
 * - quickbooks (billing)
 */

const CONNECTOR_MANIFESTS: Record<string, ConnectorManifest> = {
  stripe: stripeManifest,
  gmail: gmailManifest,
  googlecalendar: googleCalendarManifest,
  googledrive: googleDriveManifest,
  hubspot: hubspotManifest,
  linear: linearManifest,
  zoom: zoomManifest,
  slack: slackManifest,
  notion: notionManifest,
  quickbooks: quickbooksManifest,
};

export function getConnectorManifest(toolkit: string): ConnectorManifest | null {
  const normalizedToolkit = toolkit.toLowerCase().replace(/[^a-z0-9]/g, "");

  if (CONNECTOR_MANIFESTS[normalizedToolkit]) {
    return CONNECTOR_MANIFESTS[normalizedToolkit];
  }

  for (const [key, manifest] of Object.entries(CONNECTOR_MANIFESTS)) {
    if (manifest.connector.provider.toLowerCase() === normalizedToolkit) {
      return manifest;
    }
  }

  return null;
}

export function hasConnectorManifest(toolkit: string): boolean {
  return getConnectorManifest(toolkit) !== null;
}

export function listConnectorManifests(): ConnectorManifest[] {
  return Object.values(CONNECTOR_MANIFESTS);
}

export function getConnectorIds(): string[] {
  return Object.values(CONNECTOR_MANIFESTS).map((m) => m.connector.id);
}

export { stripeManifest } from "./stripe";
export { gmailManifest } from "./gmail";
export { googleCalendarManifest } from "./google-calendar";
export { googleDriveManifest } from "./google-drive";
export { hubspotManifest } from "./hubspot";
export { linearManifest } from "./linear";
export { zoomManifest } from "./zoom";
export { slackManifest } from "./slack";
export { notionManifest } from "./notion";
export { quickbooksManifest } from "./quickbooks";
