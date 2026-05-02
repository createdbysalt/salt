/**
 * Knowledge Feature - Components
 *
 * Export all knowledge-related UI components.
 */

export { KnowledgeCard } from "./KnowledgeCard";
export type { KnowledgeCardProps } from "./KnowledgeCard";

export { KnowledgeList } from "./KnowledgeList";
export type { KnowledgeListProps } from "./KnowledgeList";

export { KnowledgeSearch } from "./KnowledgeSearch";
export type { KnowledgeSearchProps } from "./KnowledgeSearch";

// Dense list components (Linear-style)
export { KnowledgeRow } from "./KnowledgeRow";
export { KnowledgeDenseList } from "./KnowledgeDenseList";
export { QuickActionsBar } from "./QuickActionsBar";
export type { QuickAction } from "./QuickActionsBar";
export { TypeFilterPills, getTypesForFilter } from "./TypeFilterPills";
export type { FilterType } from "./TypeFilterPills";

// Unified toolbar and card grid (Google Drive pattern)
export { KnowledgeToolbar } from "./KnowledgeToolbar";
export type { ViewMode } from "./KnowledgeToolbar";
export { KnowledgeCardGrid } from "./KnowledgeCardGrid";

// Preview modal and detail view
export { KnowledgePreviewModal } from "./KnowledgePreviewModal";
export { KnowledgeDetailView } from "./KnowledgeDetailView";

// Bridge (client portal) components - read-only versions
export { TableKnowledgeCard } from "./TableKnowledgeCard";
export type { TableKnowledgeCardProps } from "./TableKnowledgeCard";

export { TableKnowledgeList } from "./TableKnowledgeList";
export type { TableKnowledgeListProps } from "./TableKnowledgeList";
