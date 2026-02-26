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
export type { LifecycleStage, ClientStatusFilter } from "./ClientFilters";
export {
  DisplaySettingsPopover,
  useDisplaySettings,
  DISPLAY_PROPERTIES,
} from "./DisplaySettingsPopover";
export type { DisplaySettings, DisplayProperty } from "./DisplaySettingsPopover";
export { ClientCell } from "./ClientCell";
export { ClientListTable } from "./ClientListTable";
export type { ClientListItem, ClientTableViewMode } from "./ClientListTable";
export { ClientsDataTable, columns as clientColumns } from "./ClientsDataTable";
export type { Client, LifecycleStage as ClientLifecycleStageType, SortingState, VisibilityState, RowSelectionState } from "./ClientsDataTable";
export { ClientsBoardView } from "./ClientsBoardView";
export { ClientsGridView } from "./ClientsGridView";

// Client Detail components
export { ClientDetailLayout } from "./ClientDetailLayout";
export {
  ClientDetailSidebar,
  LIFECYCLE_STAGES,
} from "./ClientDetailSidebar";
export type { ClientLifecycleStage } from "./ClientDetailSidebar";
export { ClientDetailsMobileView } from "./ClientDetailsMobileView";
export { UserInfoCard } from "./UserInfoCard";
export { CollapsibleSection } from "./CollapsibleSection";
export { PropertyRow } from "./PropertyRow";

// Tab Components
export { PeopleTab } from "./PeopleTab";
export type { ClientContact, ContactRole, BridgeStatus } from "./PeopleTab";
export { ProjectsTab } from "./ProjectsTab";
export { FilesTab } from "./FilesTab";
export { CommunicationTab } from "./CommunicationTab";

// Dialogs
export { NewClientDialog } from "./NewClientDialog";
export { ImportClientsDialog } from "./ImportClientsDialog";

// Add Client Sheet (Multi-step flow)
export { AddClientSheet } from "./AddClientSheet";
export type {
  ClientIntent,
  ClientType,
  AddClientStep,
  ClientCreateData,
  CreatedClient,
} from "./AddClientSheet";
export { AddClientIntentStep } from "./AddClientIntentStep";
export { AddClientFormStep } from "./AddClientFormStep";
export { AddClientSuccessStep } from "./AddClientSuccessStep";
export { ClientTypeToggle } from "./ClientTypeToggle";
