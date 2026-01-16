/**
 * SEO Feature - Components
 *
 * UI components for SEO dashboards and audits.
 *
 * Usage:
 *   import { ScoreGaugesGrid, TrendsChart } from '@/app/_features/seo/components'
 */

export { ScoreGaugesGrid } from "./score-gauges";
export type { LighthouseScores } from "./score-gauges";

export { AuditBreakdown } from "./audit-breakdown";
export type { PageSpeedRawData } from "./audit-breakdown";

export { TrendsChart } from "./trends-chart";
export type { AuditDataPoint } from "./trends-chart";

export { VitalsCard } from "./vitals-card";

export { SeoAlertsSection } from "./seo-alerts";

export { BridgeSeoWidget } from "./bridge-seo-widget";
