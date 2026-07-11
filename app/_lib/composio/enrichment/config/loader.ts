import { parse as parseYaml } from "yaml";
import { validateManifest, safeValidateManifest, type ConnectorManifest } from "./manifest-schema";

/**
 * YAML config loader for connector manifests.
 * Supports loading from string content or inline objects.
 */

export interface LoadResult {
  success: boolean;
  manifest?: ConnectorManifest;
  errors?: string[];
}

export function loadManifestFromYaml(yamlContent: string): LoadResult {
  try {
    const parsed = parseYaml(yamlContent);
    const result = safeValidateManifest(parsed);

    if (result.success && result.data) {
      return { success: true, manifest: result.data };
    }

    const errors = result.error?.errors.map((e) => {
      const path = e.path.join(".");
      return `${path}: ${e.message}`;
    }) ?? ["Unknown validation error"];

    return { success: false, errors };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to parse YAML";
    return { success: false, errors: [message] };
  }
}

export function loadManifestFromObject(obj: unknown): LoadResult {
  const result = safeValidateManifest(obj);

  if (result.success && result.data) {
    return { success: true, manifest: result.data };
  }

  const errors = result.error?.errors.map((e) => {
    const path = e.path.join(".");
    return `${path}: ${e.message}`;
  }) ?? ["Unknown validation error"];

  return { success: false, errors };
}

export function loadManifestStrict(yamlContent: string): ConnectorManifest {
  const parsed = parseYaml(yamlContent);
  return validateManifest(parsed);
}

const manifestCache = new Map<string, ConnectorManifest>();

export function getCachedManifest(connectorId: string): ConnectorManifest | undefined {
  return manifestCache.get(connectorId);
}

export function setCachedManifest(connectorId: string, manifest: ConnectorManifest): void {
  manifestCache.set(connectorId, manifest);
}

export function clearManifestCache(): void {
  manifestCache.clear();
}

export function getManifestCacheSize(): number {
  return manifestCache.size;
}
