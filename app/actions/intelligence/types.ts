/**
 * Intelligence Actions - Shared Types
 */

// ============================================================================
// Event Types
// ============================================================================

export type EventType = "strategic" | "technical";
export type EventUrgency = "critical" | "high" | "medium" | "low";
export type EventStatus = "new" | "viewed" | "actioned" | "dismissed" | "archived";
export type EventSource = "lighthouse" | "crux" | "competitor_monitor" | "manual" | "ai_analysis";

export interface IntelligenceEvent {
  id: string;
  studio_id: string;
  project_id: string | null;
  client_id: string | null;
  event_type: EventType;
  category: string;
  urgency: EventUrgency;
  title: string;
  summary: string;
  details: Record<string, unknown>;
  impact: string | null;
  recommendation: string | null;
  source: EventSource;
  source_url: string | null;
  raw_data: Record<string, unknown>;
  status: EventStatus;
  dismissed_at: string | null;
  dismissed_by: string | null;
  archived_at: string | null;
  is_saved: boolean;
  saved_at: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface IntelligenceEventWithRelations extends IntelligenceEvent {
  project?: {
    id: string;
    name: string;
  } | null;
  client?: {
    id: string;
    name: string;
  } | null;
}

// ============================================================================
// Queue Types
// ============================================================================

export type QueueJobStatus = "pending" | "running" | "completed" | "failed" | "cancelled";
export type QueueJobType =
  | "competitive_analysis"
  | "seo_audit"
  | "content_brief"
  | "market_research"
  | "performance_report";

export interface IntelligenceQueueJob {
  id: string;
  studio_id: string;
  project_id: string | null;
  client_id: string | null;
  job_type: QueueJobType;
  job_config: Record<string, unknown>;
  status: QueueJobStatus;
  progress: number;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  result_event_id: string | null;
  created_by: string;
  created_at: string;
}

export interface QueueJobWithRelations extends IntelligenceQueueJob {
  project?: {
    id: string;
    name: string;
  } | null;
  client?: {
    id: string;
    name: string;
  } | null;
  result_event?: IntelligenceEvent | null;
}

// ============================================================================
// Filter Types
// ============================================================================

export interface FeedFilters {
  type?: EventType | "all";
  urgency?: EventUrgency | "all";
  status?: EventStatus | "all";
  project_id?: string;
  client_id?: string;
  timeRange?: "realtime" | "24h" | "7d" | "30d";
}

export interface LibraryFilters {
  search?: string;
  type?: EventType | "all";
  project_id?: string;
  client_id?: string;
  tags?: string[];
}

// ============================================================================
// Response Types
// ============================================================================

export type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; errorCode: string; message: string };
