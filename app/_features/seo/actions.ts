/**
 * SEO Feature - Server Actions
 *
 * This module re-exports actions from the centralized SEO module.
 * Handles SEO configuration, audits, alerts, and client data.
 *
 * Usage:
 *   import { runAudit, getSeoOverview } from '@/app/_features/seo/actions'
 *   import type { SeoConfig } from '@/app/_features/seo/types'
 */

// Config actions
export { getSeoConfig } from "@/app/actions/seo/get-seo-config";
export { updateSeoConfig } from "@/app/actions/seo/update-seo-config";

// Audit actions
export { runAudit } from "@/app/actions/seo/run-audit";
export { getAudits } from "@/app/actions/seo/get-audits";

// Overview actions
export { getSeoOverview } from "@/app/actions/seo/get-seo-overview";

// Client actions (for Bridge)
export { getClientSeoData } from "@/app/actions/seo/get-client-seo-data";
export { getClientSeoDetail } from "@/app/actions/seo/get-client-seo-detail";

// Alert actions
export { getSeoAlerts, getSeoAlertCount } from "@/app/actions/seo/get-seo-alerts";
export { dismissSeoAlert } from "@/app/actions/seo/dismiss-seo-alert";
