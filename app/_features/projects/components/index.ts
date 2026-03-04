/**
 * Projects Feature - Components
 *
 * UI components for project management and intelligence dashboards.
 *
 * Usage:
 *   import { ProjectHeader, ProjectTabs } from '@/app/_features/projects/components'
 */

export { ProjectHeader } from "./project-header";

export { ProjectTabs } from "./project-tabs";

export { ProjectIntelligenceDashboard } from "./project-intelligence-dashboard";

export { IntelligenceTaskCard, IntelligenceTasksList } from "./intelligence-task-card";
export type { IntelligenceTask } from "./intelligence-task-card";

// Display views (legacy - ProjectsToolbar is being replaced by ProjectListHeader)
export { ProjectsToolbar } from "./ProjectsToolbar";
export type { ProjectViewMode } from "./ProjectsToolbar";
export { ProjectsBoardView } from "./ProjectsBoardView";

// New display components (aligned with Clients page pattern)
export { ProjectsGridView } from "./ProjectsGridView";
export { ProjectsListView } from "./ProjectsListView";
export {
  ProjectsDataTable,
  type Project as ProjectDataTableItem,
  type RowSelectionState as ProjectRowSelectionState,
  type SortingState as ProjectSortingState,
  type VisibilityState as ProjectVisibilityState,
} from "./ProjectsDataTable";
export { ProjectsBulkActionBar } from "./ProjectsBulkActionBar";
export { ProjectsTimelineView } from "./ProjectsTimelineView";
export { ProjectDetailTimeline } from "./ProjectDetailTimeline";
export { ProjectFilters } from "./ProjectFilters";
export type { ProjectStatus, ProjectType } from "./ProjectFilters";
export { ProjectListHeader } from "./ProjectListHeader";
export {
  ProjectDisplaySettingsPopover,
  useProjectDisplaySettings,
  PROJECT_DISPLAY_PROPERTIES,
} from "./ProjectDisplaySettings";
export type {
  ProjectDisplaySettings,
  ProjectViewMode as ProjectDisplayViewMode,
  ProjectSortOption,
  ProjectDisplayProperty,
} from "./ProjectDisplaySettings";

// Milestone components
export { MilestoneList } from "./MilestoneList";
export { MilestoneItem } from "./MilestoneItem";
export { MilestoneCreateDialog } from "./MilestoneCreateDialog";
export { MilestoneTemplateSelector } from "./MilestoneTemplateSelector";
export { MilestoneEmptyState } from "./MilestoneEmptyState";

// Project detail components
export { ProjectProgressCard } from "./ProjectProgressCard";
export { ProjectPropertiesSidebar } from "./ProjectPropertiesSidebar";
