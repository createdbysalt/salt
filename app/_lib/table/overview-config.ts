import { z } from "zod";
import type {
  BridgeOverviewConfig,
  LayoutStyle,
  WidgetConfig,
  WidgetId,
  QuickActionButton,
  KnowledgeBaseLink,
} from "./types";

/**
 * Zod schemas for Bridge Overview configuration validation
 */

export const quickActionButtonSchema = z.object({
  id: z.enum(["new-request", "knowledge-base", "projects", "settings"]),
  label: z.string(),
  href: z.string(),
  enabled: z.boolean(),
});

export const knowledgeBaseLinkSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string(),
});

export const widgetSettingsSchema = z.object({
  welcomeText: z.string().optional(),
  projectViewStyle: z.enum(["grid", "list"]).optional(),
  activityDays: z.union([z.literal(3), z.literal(7), z.literal(14)]).optional(),
  quickActionButtons: z.array(quickActionButtonSchema).optional(),
  knowledgeBaseLinks: z.array(knowledgeBaseLinkSchema).optional(),
});

export const widgetConfigSchema = z.object({
  id: z.enum([
    "welcome-message",
    "latest-intelligence",
    "project-status",
    "needs-attention",
    "performance-snapshot",
    "recent-activity",
    "quick-actions",
    "knowledge-base-shortcuts",
  ]),
  visible: z.boolean(),
  order: z.number(),
  settings: widgetSettingsSchema.optional(),
});

export const bridgeOverviewConfigSchema = z.object({
  layoutStyle: z.enum(["grid", "list", "dashboard"]),
  widgets: z.array(widgetConfigSchema),
});

/**
 * Default configuration for Bridge Overview
 * Used when no config is saved or as a fallback
 */
export function getDefaultBridgeOverviewConfig(): BridgeOverviewConfig {
  return {
    layoutStyle: "grid",
    widgets: [
      {
        id: "welcome-message",
        visible: true,
        order: 0,
        settings: {
          welcomeText: "",
        },
      },
      {
        id: "recent-activity",
        visible: true,
        order: 1,
        settings: {
          activityDays: 7,
        },
      },
      {
        id: "project-status",
        visible: true,
        order: 2,
        settings: {
          projectViewStyle: "grid",
        },
      },
      {
        id: "latest-intelligence",
        visible: true,
        order: 3,
        settings: {},
      },
      {
        id: "needs-attention",
        visible: true,
        order: 4,
        settings: {},
      },
      {
        id: "performance-snapshot",
        visible: true,
        order: 5,
        settings: {},
      },
      {
        id: "quick-actions",
        visible: true,
        order: 6,
        settings: {
          quickActionButtons: [
            {
              id: "new-request",
              label: "New Request",
              href: "/table/requests",
              enabled: true,
            },
            {
              id: "knowledge-base",
              label: "Knowledge Base",
              href: "/table/files",
              enabled: true,
            },
            {
              id: "projects",
              label: "View Projects",
              href: "/table/projects",
              enabled: true,
            },
            {
              id: "settings",
              label: "Settings",
              href: "/table/settings",
              enabled: true,
            },
          ],
        },
      },
      {
        id: "knowledge-base-shortcuts",
        visible: true,
        order: 7,
        settings: {
          knowledgeBaseLinks: [
            {
              id: "files",
              title: "Browse Files",
              url: "/table/files",
            },
            {
              id: "resources",
              title: "Resources",
              url: "/table/resources",
            },
          ],
        },
      },
    ],
  };
}

/**
 * Merge saved config with defaults
 * - Adds new widgets if they don't exist in saved config
 * - Removes unknown widget IDs
 * - Validates and sanitizes all settings
 */
export function mergeBridgeOverviewConfig(
  savedConfig: any
): BridgeOverviewConfig {
  const defaultConfig = getDefaultBridgeOverviewConfig();

  // If no saved config or invalid, return default
  if (!savedConfig || typeof savedConfig !== "object") {
    return defaultConfig;
  }

  try {
    // Validate the saved config structure
    const validated = bridgeOverviewConfigSchema.parse(savedConfig);

    // Get all known widget IDs from default config
    const knownWidgetIds = new Set(defaultConfig.widgets.map((w) => w.id));

    // Filter out unknown widgets
    const validWidgets = validated.widgets.filter((w) =>
      knownWidgetIds.has(w.id)
    );

    // Find widgets that exist in default but not in saved config
    const savedWidgetIds = new Set(validWidgets.map((w) => w.id));
    const missingWidgets = defaultConfig.widgets.filter(
      (w) => !savedWidgetIds.has(w.id)
    );

    // Add missing widgets to the end
    const maxOrder = validWidgets.length > 0 
      ? Math.max(...validWidgets.map((w) => w.order))
      : -1;
    
    const newWidgets = missingWidgets.map((w, index) => ({
      ...w,
      order: maxOrder + index + 1,
    }));

    return {
      layoutStyle: validated.layoutStyle,
      widgets: [...validWidgets, ...newWidgets].sort((a, b) => a.order - b.order) as WidgetConfig[],
    };
  } catch (error) {
    console.error("Invalid Bridge Overview config, using defaults:", error);
    return defaultConfig;
  }
}

/**
 * Get widget by ID from config
 */
export function getWidgetConfig(
  config: BridgeOverviewConfig,
  widgetId: WidgetId
): WidgetConfig | undefined {
  return config.widgets.find((w) => w.id === widgetId);
}

/**
 * Get visible widgets sorted by order
 */
export function getVisibleWidgets(
  config: BridgeOverviewConfig
): WidgetConfig[] {
  return config.widgets
    .filter((w) => w.visible)
    .sort((a, b) => a.order - b.order);
}

