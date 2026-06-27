import "server-only";

import { cache } from "react";
import { getWorkspaceContext } from "@/app/_lib/utils/user-dashboard";
import type { LifecycleEventType } from "@/app/_features/memory/types/taxonomies";
import {
  LIFECYCLE_EVENT_LABELS,
} from "@/app/_features/memory/types/taxonomies";

export interface LifecycleEvent {
  id: string;
  eventType: LifecycleEventType;
  fromValue: string | null;
  toValue: string;
  source: "rule" | "ai_inference" | "manual" | "system";
  because: string | null;
  createdAt: string;
}

export interface LifecycleEventDisplay extends LifecycleEvent {
  label: string;
  description: string;
}

function mapLifecycleRow(row: Record<string, unknown>): LifecycleEvent {
  return {
    id: row.id as string,
    eventType: row.event_type as LifecycleEventType,
    fromValue: (row.from_value as string | null) ?? null,
    toValue: row.to_value as string,
    source: row.source as "rule" | "ai_inference" | "manual" | "system",
    because: (row.because as string | null) ?? null,
    createdAt: row.created_at as string,
  };
}

function formatEventDescription(event: LifecycleEvent): string {
  const eventLabel = LIFECYCLE_EVENT_LABELS[event.eventType] ?? event.eventType;

  if (event.eventType === "status_change" || event.eventType === "relationship_change" || event.eventType === "health_change") {
    const from = event.fromValue ?? "none";
    const to = event.toValue;
    return `${from} → ${to}`;
  }

  if (event.eventType === "created") {
    return "Record created";
  }

  return event.because ?? eventLabel;
}

export function toLifecycleEventDisplay(event: LifecycleEvent): LifecycleEventDisplay {
  return {
    ...event,
    label: LIFECYCLE_EVENT_LABELS[event.eventType] ?? event.eventType,
    description: formatEventDescription(event),
  };
}

export const getEntityLifecycleEvents = cache(
  async (
    entityType: "person" | "organization" | "work",
    entityId: string,
    limit = 50
  ): Promise<LifecycleEventDisplay[]> => {
    const { workspace, supabase } = await getWorkspaceContext();

    const { data, error } = await supabase
      .from("lifecycle_events")
      .select("id, event_type, from_value, to_value, source, because, created_at")
      .eq("workspace_id", workspace.id)
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching lifecycle events:", error);
      return [];
    }

    return (data ?? [])
      .map((row) => mapLifecycleRow(row as Record<string, unknown>))
      .map(toLifecycleEventDisplay);
  }
);

export const getOrgLifecycleEvents = cache(async (orgId: string) => {
  return getEntityLifecycleEvents("organization", orgId);
});

export const getPersonLifecycleEvents = cache(async (personId: string) => {
  return getEntityLifecycleEvents("person", personId);
});
