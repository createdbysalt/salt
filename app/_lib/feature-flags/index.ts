/**
 * Feature Flags System
 *
 * Simple feature flag implementation for gradual rollouts.
 * Flags can be controlled via environment variables or runtime config.
 *
 * Usage:
 *   import { isFeatureEnabled, FeatureFlag } from '@/app/_lib/feature-flags'
 *   if (isFeatureEnabled(FeatureFlag.USE_NEW_ENTITY_MODEL)) { ... }
 */

export enum FeatureFlag {
  /**
   * Use the new entity model (organizations + people) instead of clients.
   * When enabled, queries read from new tables and writes go to both.
   */
  USE_NEW_ENTITY_MODEL = "use_new_entity_model",

  /**
   * Enable dual-write mode: writes go to both old and new tables.
   * Used during migration to keep both systems in sync.
   */
  DUAL_WRITE_ENTITIES = "dual_write_entities",

  /**
   * Enable teams feature (internal collaboration groups).
   */
  TEAMS_ENABLED = "teams_enabled",

  /**
   * Enable entity linking (Obsidian-style [[wiki]] links).
   */
  ENTITY_LINKING = "entity_linking",
}

type FeatureFlagConfig = {
  [K in FeatureFlag]: {
    description: string;
    defaultValue: boolean;
    envVar?: string;
  };
};

const FLAG_CONFIG: FeatureFlagConfig = {
  [FeatureFlag.USE_NEW_ENTITY_MODEL]: {
    description: "Use new entity model (organizations + people)",
    defaultValue: false,
    envVar: "FEATURE_NEW_ENTITY_MODEL",
  },
  [FeatureFlag.DUAL_WRITE_ENTITIES]: {
    description: "Write to both old and new entity tables",
    defaultValue: false,
    envVar: "FEATURE_DUAL_WRITE",
  },
  [FeatureFlag.TEAMS_ENABLED]: {
    description: "Enable teams feature",
    defaultValue: false,
    envVar: "FEATURE_TEAMS",
  },
  [FeatureFlag.ENTITY_LINKING]: {
    description: "Enable entity linking",
    defaultValue: false,
    envVar: "FEATURE_ENTITY_LINKING",
  },
};

/**
 * Check if a feature flag is enabled.
 *
 * Checks in order:
 * 1. Runtime override (if set via setFeatureFlag)
 * 2. Environment variable
 * 3. Default value from config
 */
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  // Check runtime override first
  if (runtimeOverrides.has(flag)) {
    return runtimeOverrides.get(flag)!;
  }

  const config = FLAG_CONFIG[flag];

  // Check environment variable
  if (config.envVar && typeof process !== "undefined" && process.env) {
    const envValue = process.env[config.envVar];
    if (envValue !== undefined) {
      return envValue === "true" || envValue === "1";
    }
  }

  // Fall back to default
  return config.defaultValue;
}

/**
 * Runtime overrides for testing or dynamic configuration.
 */
const runtimeOverrides = new Map<FeatureFlag, boolean>();

/**
 * Set a feature flag at runtime.
 * Useful for testing or admin overrides.
 */
export function setFeatureFlag(flag: FeatureFlag, enabled: boolean): void {
  runtimeOverrides.set(flag, enabled);
}

/**
 * Clear a runtime override for a flag.
 */
export function clearFeatureFlag(flag: FeatureFlag): void {
  runtimeOverrides.delete(flag);
}

/**
 * Clear all runtime overrides.
 */
export function clearAllFeatureFlags(): void {
  runtimeOverrides.clear();
}

/**
 * Get all feature flags and their current values.
 * Useful for debugging or admin UI.
 */
export function getAllFeatureFlags(): Array<{
  flag: FeatureFlag;
  description: string;
  enabled: boolean;
  source: "runtime" | "env" | "default";
}> {
  return Object.values(FeatureFlag).map((flag) => {
    const config = FLAG_CONFIG[flag];
    let source: "runtime" | "env" | "default" = "default";
    let enabled = config.defaultValue;

    if (runtimeOverrides.has(flag)) {
      source = "runtime";
      enabled = runtimeOverrides.get(flag)!;
    } else if (config.envVar && process.env[config.envVar] !== undefined) {
      source = "env";
      enabled =
        process.env[config.envVar] === "true" ||
        process.env[config.envVar] === "1";
    }

    return {
      flag,
      description: config.description,
      enabled,
      source,
    };
  });
}
