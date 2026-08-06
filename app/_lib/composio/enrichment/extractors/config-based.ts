import "server-only";

import type { Extractor, ExtractorContext } from "./base";
import { emptyResult } from "./base";
import type { ConnectorCategory, ExtractorResult } from "../types";
import { getConnectorManifest, hasConnectorManifest } from "../connectors";
import { extractWithManifest, getQueryFromManifest } from "../config-driven-extractor";
import { executeComposioAction } from "../../actions";
import { getConnectionStatusAdmin } from "../../connections";

/**
 * Config-based extractor that uses YAML manifests instead of hardcoded logic.
 * Wraps the config-driven extraction system in the Extractor interface.
 */

export function createConfigBasedExtractor(
  toolkit: string,
  category: ConnectorCategory
): Extractor | null {
  const manifest = getConnectorManifest(toolkit);
  if (!manifest) return null;

  return {
    category,
    supportedToolkits: [toolkit],

    async extract(ctx: ExtractorContext): Promise<ExtractorResult> {
      const { workspaceId, entityType, seed } = ctx;

      const queryInfo = getQueryFromManifest(manifest, entityType, seed);
      if (!queryInfo) {
        return emptyResult(`${toolkit}:no-config`);
      }

      const connection = await getConnectionStatusAdmin(toolkit, workspaceId);
      if (!connection.connected || !connection.composioConnectionId) {
        return emptyResult(`${toolkit}:not-connected`);
      }

      try {
        const actionParams = {
          query: queryInfo.query,
          ...queryInfo.params,
        };

        const response = await executeComposioAction<
          typeof actionParams,
          Record<string, unknown>
        >(
          queryInfo.action,
          actionParams,
          connection.composioConnectionId,
          workspaceId,
          {
            skipAuthCheck: true,
            workspaceId,
            unattended: true,
          }
        );

        if (!response) {
          return emptyResult(`${toolkit}:api-error`);
        }

        const result = extractWithManifest(manifest, entityType, response, seed);

        return {
          source: result.source,
          fields: result.fields,
          connections: result.connections,
          notes: result.notes,
          hasData: result.hasData,
        };
      } catch (error) {
        console.error(`[config-based-extractor] ${toolkit} extraction failed:`, error);
        return emptyResult(`${toolkit}:error`);
      }
    },
  };
}

export function getConfigBasedExtractors(): Extractor[] {
  const extractors: Extractor[] = [];

  const toolkitConfigs: Array<{ toolkit: string; category: ConnectorCategory }> = [
    { toolkit: "stripe", category: "billing" },
    { toolkit: "gmail", category: "email" },
    { toolkit: "googlecalendar", category: "calendar" },
    { toolkit: "googledrive", category: "storage" },
    { toolkit: "hubspot", category: "crm" },
    { toolkit: "notion", category: "documents" },
    { toolkit: "linear", category: "project_management" },
    { toolkit: "quickbooks", category: "billing" },
    { toolkit: "slack", category: "email" },
    { toolkit: "zoom", category: "meetings" },
  ];

  for (const { toolkit, category } of toolkitConfigs) {
    if (hasConnectorManifest(toolkit)) {
      const extractor = createConfigBasedExtractor(toolkit, category);
      if (extractor) {
        extractors.push(extractor);
      }
    }
  }

  return extractors;
}

export function isConfigBasedToolkit(toolkit: string): boolean {
  return hasConnectorManifest(toolkit);
}
