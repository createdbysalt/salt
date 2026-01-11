/**
 * SEO Server Actions
 *
 * Server actions for managing SEO configuration and audits.
 */

// Config actions
export { getSeoConfig } from "./get-seo-config";
export type {
  GetSeoConfigInput,
  GetSeoConfigResponse,
  SeoConfig,
  ClientVisibleMetrics,
} from "./get-seo-config";

export { updateSeoConfig } from "./update-seo-config";
export type {
  UpdateSeoConfigInput,
  UpdateSeoConfigResponse,
} from "./update-seo-config";

// Audit actions
export { runAudit } from "./run-audit";
export type {
  RunAuditInput,
  RunAuditResponse,
  RunAuditResult,
  SeoAudit,
  SeoAlert,
  ScoreDropMetadata,
} from "./run-audit";

// Re-export CrUX types for convenience
export type { CoreWebVitals, ThresholdStatus, WebVitalMetric } from "@/libs/seo/crux";

export { getAudits } from "./get-audits";
export type {
  GetAuditsInput,
  GetAuditsResponse,
  GetAuditsData,
  SeoAuditRecord,
} from "./get-audits";

// Overview actions
export { getSeoOverview } from "./get-seo-overview";
export type {
  GetSeoOverviewResponse,
  SeoOverviewData,
  ProjectWithSeoData,
} from "./get-seo-overview";

// Client actions (for Bridge)
export { getClientSeoData } from "./get-client-seo-data";
export type {
  GetClientSeoDataInput,
  GetClientSeoDataResponse,
  ClientSeoData,
} from "./get-client-seo-data";

export { getClientSeoDetail } from "./get-client-seo-detail";
export type {
  GetClientSeoDetailInput,
  GetClientSeoDetailResponse,
  ClientSeoDetail,
  ClientAuditRecord,
} from "./get-client-seo-detail";

// Alert actions
export { getSeoAlerts, getSeoAlertCount } from "./get-seo-alerts";
export type {
  GetSeoAlertsInput,
  GetSeoAlertsResponse,
  GetSeoAlertsData,
  SeoAlertWithProject,
} from "./get-seo-alerts";

export { dismissSeoAlert } from "./dismiss-seo-alert";
export type {
  DismissSeoAlertInput,
  DismissSeoAlertResponse,
} from "./dismiss-seo-alert";
