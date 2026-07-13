/**
 * Play Card Analytics Events
 *
 * Tracks user interactions with play cards for understanding approval rates,
 * edit frequency, and correction patterns per playbook.
 */

type PostHog = {
  capture: (event: string, properties?: Record<string, unknown>) => void;
};

function getPostHog(): PostHog | null {
  if (typeof window === "undefined") return null;
  return (window as Window & { posthog?: PostHog }).posthog ?? null;
}

interface PlayEventBase {
  playbook_slug: string | null;
  output_type: string | null;
  tab: "needs_you" | "auto_handled" | "watching";
  confidence: number | null;
}

interface PlayViewedEvent extends PlayEventBase {
  play_id: string;
}

interface PlayExpandedEvent extends PlayEventBase {
  play_id: string;
  time_since_viewed_ms: number;
}

interface PlayActionedEvent extends PlayEventBase {
  play_id: string;
  action: "approve" | "dismiss" | "undo" | "answer";
  time_since_viewed_ms: number;
  was_edited: boolean;
}

interface PlayEditedEvent extends PlayEventBase {
  play_id: string;
  field_edited: "draft" | "field_value";
}

interface BatchActionedEvent {
  playbook_slug: string | null;
  count: number;
  action: "approve" | "dismiss";
}

interface QueueEmptyStateEvent {
  tab: "needs_you" | "auto_handled" | "watching";
}

export function trackPlayViewed(event: PlayViewedEvent): void {
  getPostHog()?.capture("play.viewed", { ...event });
}

export function trackPlayExpanded(event: PlayExpandedEvent): void {
  getPostHog()?.capture("play.expanded", { ...event });
}

export function trackPlayActioned(event: PlayActionedEvent): void {
  getPostHog()?.capture("play.actioned", { ...event });
}

export function trackPlayEdited(event: PlayEditedEvent): void {
  getPostHog()?.capture("play.edited", { ...event });
}

export function trackBatchActioned(event: BatchActionedEvent): void {
  getPostHog()?.capture("batch.actioned", { ...event });
}

export function trackQueueEmptyState(event: QueueEmptyStateEvent): void {
  getPostHog()?.capture("queue.empty_state_shown", { ...event });
}
