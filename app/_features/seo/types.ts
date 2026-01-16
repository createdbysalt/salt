/**
 * SEO Feature - Types
 *
 * Re-exports types from the SEO module.
 *
 * Usage:
 *   import type { SeoConfig, SeoAudit } from '@/app/_features/seo/types'
 */

export type {
  GetSeoConfigInput,
  GetSeoConfigResponse,
  SeoConfig,
  ClientVisibleMetrics,
} from "@/app/actions/seo/get-seo-config";

export type {
  UpdateSeoConfigInput,
  UpdateSeoConfigResponse,
} from "@/app/actions/seo/update-seo-config";

export type {
  RunAuditInput,
  RunAuditResponse,
  RunAuditResult,
  SeoAudit,
  SeoAlert,
  ScoreDropMetadata,
} from "@/app/actions/seo/run-audit";

export type {
  GetAuditsInput,
  GetAuditsResponse,
  GetAuditsData,
  SeoAuditRecord,
} from "@/app/actions/seo/get-audits";

export type {
  GetSeoOverviewResponse,
  SeoOverviewData,
  ProjectWithSeoData,
} from "@/app/actions/seo/get-seo-overview";

export type {
  GetClientSeoDataInput,
  GetClientSeoDataResponse,
  ClientSeoData,
} from "@/app/actions/seo/get-client-seo-data";

export type {
  GetClientSeoDetailInput,
  GetClientSeoDetailResponse,
  ClientSeoDetail,
  ClientAuditRecord,
} from "@/app/actions/seo/get-client-seo-detail";

export type {
  GetSeoAlertsInput,
  GetSeoAlertsResponse,
  GetSeoAlertsData,
  SeoAlertWithProject,
} from "@/app/actions/seo/get-seo-alerts";

export type {
  DismissSeoAlertInput,
  DismissSeoAlertResponse,
} from "@/app/actions/seo/dismiss-seo-alert";

// Re-export CrUX types
export type { CoreWebVitals, ThresholdStatus, WebVitalMetric } from "@/libs/seo/crux";
