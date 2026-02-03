/**
 * Clients Feature - Components
 *
 * UI components for client management and engagement.
 *
 * Usage:
 *   import { ClientMessageButton } from '@/app/_features/clients/components'
 */

// Legacy components
export { ClientMessageButton } from "./client-message-button";
export { ClientProjectCard } from "./client-project-card";
export { ClientActivityFeed } from "./client-activity-feed";
export { ClientIntelligencePanel } from "./client-intelligence-panel";

// Client List components (Copilot-style redesign)
export { ClientListHeader } from "./ClientListHeader";
export type { ViewMode } from "./ClientListHeader";
export { ClientFilters } from "./ClientFilters";
export type { LifecycleStage } from "./ClientFilters";
export {
  DisplaySettingsPopover,
  useDisplaySettings,
  DISPLAY_PROPERTIES,
} from "./DisplaySettingsPopover";
export type { DisplaySettings, DisplayProperty } from "./DisplaySettingsPopover";
export { ClientCell } from "./ClientCell";
export { ClientListTable } from "./ClientListTable";
export type { ClientListItem } from "./ClientListTable";
export { ClientsBoardView } from "./ClientsBoardView";
export { ClientsGridView } from "./ClientsGridView";

// Client Detail components
export { ClientDetailLayout } from "./ClientDetailLayout";
export { ClientDetailSidebar } from "./ClientDetailSidebar";
export { UserInfoCard } from "./UserInfoCard";
export { CollapsibleSection } from "./CollapsibleSection";
export { PropertyRow } from "./PropertyRow";

// Dialogs
export { NewClientDialog } from "./NewClientDialog";
export { ImportClientsDialog } from "./ImportClientsDialog";
