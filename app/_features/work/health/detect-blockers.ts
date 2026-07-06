import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export interface DetectedBlocker {
  blockerType: string;
  title: string;
  detail: string | null;
  sourceEntityType: string | null;
  sourceEntityId: string | null;
  confidence: number;
}

export async function detectWorkBlockers(input: {
  supabase: SupabaseClient;
  workspaceId: string;
  workId: string;
}): Promise<DetectedBlocker[]> {
  const blockers: DetectedBlocker[] = [];
  const now = new Date();

  const detectors = await Promise.all([
    detectAwaitingReply(input.supabase, input.workspaceId, input.workId, now),
    detectCancelledMeeting(input.supabase, input.workspaceId, input.workId, now),
    detectOverdueInvoice(input.supabase, input.workspaceId, input.workId, now),
  ]);

  for (const detected of detectors) {
    if (detected) {
      blockers.push(detected);
    }
  }

  return blockers;
}

async function detectAwaitingReply(
  supabase: SupabaseClient,
  workspaceId: string,
  workId: string,
  now: Date,
): Promise<DetectedBlocker | null> {
  const sevenDaysAgo = new Date(now.getTime() - 7 * MS_PER_DAY);

  const { data: lastOutbound } = await supabase
    .from("capture_events")
    .select("id, at, metadata")
    .eq("workspace_id", workspaceId)
    .eq("linked_project_id", workId)
    .eq("direction", "outbound")
    .gte("at", sevenDaysAgo.toISOString())
    .order("at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!lastOutbound) return null;

  const outboundAt = new Date(lastOutbound.at);
  const daysSince = Math.floor((now.getTime() - outboundAt.getTime()) / MS_PER_DAY);

  if (daysSince < 3) return null;

  const { count: replyCount } = await supabase
    .from("capture_events")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("linked_project_id", workId)
    .eq("direction", "inbound")
    .gt("at", lastOutbound.at);

  if ((replyCount ?? 0) > 0) return null;

  const subject = (lastOutbound.metadata as Record<string, unknown>)?.subject;
  const subjectStr = typeof subject === "string" ? subject : "email";

  return {
    blockerType: "awaiting_reply",
    title: "Waiting on client response",
    detail: `Sent "${subjectStr.slice(0, 50)}" ${daysSince} days ago`,
    sourceEntityType: "capture",
    sourceEntityId: lastOutbound.id,
    confidence: daysSince >= 7 ? 0.9 : 0.7,
  };
}

async function detectCancelledMeeting(
  supabase: SupabaseClient,
  workspaceId: string,
  workId: string,
  now: Date,
): Promise<DetectedBlocker | null> {
  const fourteenDaysAgo = new Date(now.getTime() - 14 * MS_PER_DAY);

  const { data: cancelled } = await supabase
    .from("meetings")
    .select("id, title, status, updated_at")
    .eq("workspace_id", workspaceId)
    .eq("work_id", workId)
    .eq("status", "cancelled")
    .gte("updated_at", fourteenDaysAgo.toISOString())
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!cancelled) return null;

  const { count: rescheduled } = await supabase
    .from("meetings")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("work_id", workId)
    .eq("status", "scheduled")
    .gt("start_time", now.toISOString());

  if ((rescheduled ?? 0) > 0) return null;

  const cancelledAt = new Date(cancelled.updated_at);
  const daysSince = Math.floor((now.getTime() - cancelledAt.getTime()) / MS_PER_DAY);

  return {
    blockerType: "meeting_cancelled",
    title: "Meeting cancelled, not rescheduled",
    detail: `"${cancelled.title}" was cancelled ${daysSince} days ago`,
    sourceEntityType: "meeting",
    sourceEntityId: cancelled.id,
    confidence: 0.8,
  };
}

async function detectOverdueInvoice(
  supabase: SupabaseClient,
  workspaceId: string,
  workId: string,
  now: Date,
): Promise<DetectedBlocker | null> {
  const nowIso = now.toISOString();

  const { data: overdue } = await supabase
    .from("billing_records")
    .select("id, number, due_at, amount_cents, amount_paid_cents")
    .eq("work_id", workId)
    .eq("direction", "receivable")
    .in("status", ["due", "overdue", "partial"])
    .lt("due_at", nowIso)
    .order("due_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!overdue) return null;

  const dueDate = new Date(overdue.due_at);
  const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / MS_PER_DAY);

  if (daysOverdue < 7) return null;

  const outstandingCents = Math.max(
    0,
    (overdue.amount_cents ?? 0) - (overdue.amount_paid_cents ?? 0),
  );
  const amountStr = outstandingCents
    ? `$${(outstandingCents / 100).toLocaleString()}`
    : "Invoice";

  return {
    blockerType: "payment_pending",
    title: "Invoice overdue",
    detail: `${amountStr} overdue by ${daysOverdue} days`,
    sourceEntityType: "invoice",
    sourceEntityId: overdue.id,
    confidence: 0.95,
  };
}

export async function syncDetectedBlockers(input: {
  supabase: SupabaseClient;
  workspaceId: string;
  workId: string;
  detected: DetectedBlocker[];
}): Promise<void> {
  const { supabase, workspaceId, workId, detected } = input;

  const { data: existing } = await supabase
    .from("work_blockers")
    .select("id, blocker_type, source_entity_id, status")
    .eq("workspace_id", workspaceId)
    .eq("work_id", workId)
    .eq("source", "salt_inferred");

  const existingByKey = new Map<string, { id: string; status: string }>();
  for (const blocker of existing ?? []) {
    const key = `${blocker.blocker_type}:${blocker.source_entity_id ?? "none"}`;
    existingByKey.set(key, { id: blocker.id, status: blocker.status });
  }

  const toInsert: Array<{
    workspace_id: string;
    work_id: string;
    blocker_type: string;
    title: string;
    detail: string | null;
    source: string;
    source_entity_type: string | null;
    source_entity_id: string | null;
    confidence: number;
  }> = [];

  const detectedKeys = new Set<string>();

  for (const blocker of detected) {
    const key = `${blocker.blockerType}:${blocker.sourceEntityId ?? "none"}`;
    detectedKeys.add(key);

    const existingBlocker = existingByKey.get(key);
    if (existingBlocker) {
      if (existingBlocker.status === "dismissed") {
        continue;
      }
      if (existingBlocker.status === "resolved") {
        await supabase
          .from("work_blockers")
          .update({
            status: "active",
            title: blocker.title,
            detail: blocker.detail,
            confidence: blocker.confidence,
            resolved_at: null,
            resolved_by: null,
          })
          .eq("id", existingBlocker.id);
      }
    } else {
      toInsert.push({
        workspace_id: workspaceId,
        work_id: workId,
        blocker_type: blocker.blockerType,
        title: blocker.title,
        detail: blocker.detail,
        source: "salt_inferred",
        source_entity_type: blocker.sourceEntityType,
        source_entity_id: blocker.sourceEntityId,
        confidence: blocker.confidence,
      });
    }
  }

  if (toInsert.length > 0) {
    await supabase.from("work_blockers").insert(toInsert);
  }

  for (const [key, blocker] of existingByKey) {
    if (!detectedKeys.has(key) && blocker.status === "active") {
      await supabase
        .from("work_blockers")
        .update({
          status: "resolved",
          resolved_at: new Date().toISOString(),
        })
        .eq("id", blocker.id);
    }
  }
}
