import type {
  BridgeOverviewConfig,
  WidgetDataContext,
} from "@/types/bridge-overview";
import { getVisibleWidgets } from "@/libs/bridge/overview-config";
import { WelcomeMessageWidget } from "./widgets/welcome-message-widget";
import { ProjectStatusWidget } from "./widgets/project-status-widget";
import { NeedsAttentionWidget } from "./widgets/needs-attention-widget";
import { RecentActivityWidget } from "./widgets/recent-activity-widget";
import { QuickActionsWidget } from "./widgets/quick-actions-widget";
import { KnowledgeBaseShortcutsWidget } from "./widgets/knowledge-base-shortcuts-widget";
import { LatestIntelligenceWidget } from "./widgets/latest-intelligence-widget";
import { PerformanceSnapshotWidget } from "./widgets/performance-snapshot-widget";

interface BridgeOverviewProps {
  config: BridgeOverviewConfig;
  data: WidgetDataContext;
}

/**
 * Widget Registry
 * Maps widget IDs to their React components
 */
const WIDGET_REGISTRY = {
  "welcome-message": WelcomeMessageWidget,
  "latest-intelligence": LatestIntelligenceWidget,
  "project-status": ProjectStatusWidget,
  "needs-attention": NeedsAttentionWidget,
  "performance-snapshot": PerformanceSnapshotWidget,
  "recent-activity": RecentActivityWidget,
  "quick-actions": QuickActionsWidget,
  "knowledge-base-shortcuts": KnowledgeBaseShortcutsWidget,
} as const;

/**
 * Bridge Overview
 * Renders widgets based on saved configuration
 */
export function BridgeOverview({ config, data }: BridgeOverviewProps) {
  const visibleWidgets = getVisibleWidgets(config);

  // Get layout classes based on style
  const layoutClasses = {
    grid: "space-y-8",
    list: "space-y-6 max-w-4xl",
    dashboard: "space-y-8",
  }[config.layoutStyle];

  return (
    <div className={layoutClasses}>
      {visibleWidgets.map((widgetConfig) => {
        const WidgetComponent = WIDGET_REGISTRY[widgetConfig.id];

        if (!WidgetComponent) {
          console.warn(`Unknown widget ID: ${widgetConfig.id}`);
          return null;
        }

        return (
          <WidgetComponent
            key={widgetConfig.id}
            config={widgetConfig}
            data={data}
          />
        );
      })}
    </div>
  );
}

