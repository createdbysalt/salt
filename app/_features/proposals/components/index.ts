/**
 * Proposals Feature - Components
 *
 * Barrel export for proposal components.
 */

// Core Components
export { ProposalEditor } from "./ProposalEditor";
export { PricingTable } from "./PricingTable";
export { SignatureCapture } from "./SignatureCapture";
// export { ProposalViewer } from "./ProposalViewer";

// Discovery Insights (Phase 2)
export { InsightCard, type InsightCardProps, type InsightType } from "./InsightCard";
export { DiscoveryInsightsPanel } from "./DiscoveryInsightsPanel";
export {
  ExtractionProgress,
  createInitialProgress,
  progressFromExtraction,
  type ExtractionStatus,
  type CategoryProgress,
  type ExtractionProgressState,
} from "./ExtractionProgress";

// Client Intelligence Context (Phase 4)
export { ClientContextPanel } from "./ClientContextPanel";
