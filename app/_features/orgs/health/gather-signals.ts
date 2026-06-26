import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { OrgHealthSignals } from "./types";

function readCaptureSignals(extractedData: unknown): {
  youInitiated?: boolean;
  isBidirectional?: boolean;
} {
  if (!extractedData || typeof extractedData !== "object") return {};
  const data = extractedData as Record<string, unknown>;
  const signals =
    data.signals && typeof data.signals === "object"
      ? (data.signals as Record<string, unknown>)
      : data;

  return {
    youInitiated:
      typeof signals.you_initiated === "boolean" ? signals.you_initiated : undefined,
    isBidirectional:
      typeof signals.is_bidirectional_thread === "boolean"
        ? signals.is_bidirectional_thread
        : undefined,
  };
}

function emptySignals(): OrgHealthSignals {
  return {
    hasCaptureActivity: false,
    hasRevenueSignals: false,
    lastActivityAt: null,
    captureCountLast30d: 0,
    captureCountPrior30d: 0,
    hasBidirectionalContact: false,
    youInitiatedWithoutReplyDays: null,
    hasUpcomingMeeting: false,
    overdueInvoiceCount: 0,
    hasActiveRetainer: false,
    overdueMilestoneCount: 0,
    cancelledMeetingsLast30d: 0,
    orgContactCount: 0,
    keyContactQuiet: false,
    intelligenceFindingCount: 0,
  };
}

function aggregateCaptures(
  captures: Array<{ created_at: string; extracted_data: unknown }>,
  now: number,
  thirtyDaysAgo: string,
  sixtyDaysAgo: string,
  signals: OrgHealthSignals,
): void {
  if (captures.length === 0) return;

  signals.hasCaptureActivity = true;

  const sorted = [...captures].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  if (!signals.lastActivityAt) {
    signals.lastActivityAt = sorted[0]?.created_at ?? null;
  }

  for (const capture of captures) {
    const createdAt = capture.created_at;
    if (createdAt >= thirtyDaysAgo) {
      signals.captureCountLast30d += 1;
    } else if (createdAt >= sixtyDaysAgo) {
      signals.captureCountPrior30d += 1;
    }

    const captureSignals = readCaptureSignals(capture.extracted_data);
    if (captureSignals.isBidirectional) {
      signals.hasBidirectionalContact = true;
    }
    if (captureSignals.youInitiated === true && captureSignals.isBidirectional !== true) {
      const days = (now - new Date(createdAt).getTime()) / 86400000;
      if (
        signals.youInitiatedWithoutReplyDays == null ||
        days > signals.youInitiatedWithoutReplyDays
      ) {
        signals.youInitiatedWithoutReplyDays = days;
      }
    }
  }
}

export async function gatherOrgHealthSignals(input: {
  supabase: SupabaseClient;
  orgId: string;
  migratedClientId: string | null;
  primaryPersonId?: string | null;
  keyContactQuietThresholdDays?: number;
}): Promise<OrgHealthSignals> {
  const now = Date.now();
  const thirtyDaysAgo = new Date(now - 30 * 86400000).toISOString();
  const sixtyDaysAgo = new Date(now - 60 * 86400000).toISOString();
  const thirtyDaysFromNow = new Date(now + 30 * 86400000).toISOString();
  const quietThresholdDays = input.keyContactQuietThresholdDays ?? 21;

  const signals = emptySignals();

  const { data: orgPeople } = await input.supabase
    .from("organization_people")
    .select("person_id, is_primary")
    .eq("organization_id", input.orgId);

  const personIds = (orgPeople ?? [])
    .map((row) => row.person_id as string | null)
    .filter(Boolean) as string[];

  signals.orgContactCount = personIds.length;

  const primaryPersonId =
    input.primaryPersonId ??
    (orgPeople?.find((row) => row.is_primary)?.person_id as string | null) ??
    null;

  if (personIds.length > 0) {
    const [capturesResult, findingsResult] = await Promise.all([
      input.supabase
        .from("capture_events")
        .select("created_at, extracted_data, resolved_person_id")
        .in("resolved_person_id", personIds)
        .order("created_at", { ascending: false })
        .limit(200),
      input.supabase
        .from("intelligence_findings")
        .select("id", { count: "exact", head: true })
        .in("person_id", personIds),
    ]);

    aggregateCaptures(capturesResult.data ?? [], now, thirtyDaysAgo, sixtyDaysAgo, signals);
    signals.intelligenceFindingCount = findingsResult.count ?? 0;

    if (primaryPersonId) {
      const primaryCaptures = (capturesResult.data ?? []).filter(
        (row) => row.resolved_person_id === primaryPersonId,
      );
      const primaryLastAt = primaryCaptures[0]?.created_at as string | undefined;
      if (primaryLastAt) {
        const daysSincePrimary = (now - new Date(primaryLastAt).getTime()) / 86400000;
        signals.keyContactQuiet = daysSincePrimary >= quietThresholdDays;
      } else if (signals.orgContactCount > 0) {
        signals.keyContactQuiet = true;
      }
    } else if (signals.lastActivityAt) {
      const daysSinceContact = (now - new Date(signals.lastActivityAt).getTime()) / 86400000;
      signals.keyContactQuiet = daysSinceContact >= quietThresholdDays;
    }
  }

  if (!input.migratedClientId) {
    return signals;
  }

  const clientId = input.migratedClientId;
  const [
    overdueInvoicesResult,
    subscriptionsResult,
    upcomingMeetingsResult,
    cancelledMeetingsResult,
    overdueProjectsResult,
  ] = await Promise.all([
    input.supabase
      .from("portal_invoices")
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId)
      .in("status", ["overdue", "sent"])
      .lt("due_date", new Date().toISOString()),
    input.supabase
      .from("portal_client_subscriptions")
      .select("id")
      .eq("client_id", clientId)
      .in("status", ["active", "trialing"])
      .limit(1),
    input.supabase
      .from("client_meetings")
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId)
      .eq("status", "scheduled")
      .gte("start_time", new Date().toISOString())
      .lte("start_time", thirtyDaysFromNow),
    input.supabase
      .from("client_meetings")
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId)
      .in("status", ["cancelled", "no-show"])
      .gte("created_at", thirtyDaysAgo),
    input.supabase
      .from("projects")
      .select(
        `
        id,
        milestones:project_milestones!inner(id, due_at, status)
      `,
      )
      .eq("client_id", clientId)
      .lt("milestones.due_at", new Date().toISOString())
      .neq("milestones.status", "complete"),
  ]);

  signals.overdueInvoiceCount = overdueInvoicesResult.count ?? 0;
  signals.hasActiveRetainer = (subscriptionsResult.data?.length ?? 0) > 0;
  signals.hasUpcomingMeeting = (upcomingMeetingsResult.count ?? 0) > 0;
  signals.cancelledMeetingsLast30d = cancelledMeetingsResult.count ?? 0;
  signals.overdueMilestoneCount = overdueProjectsResult.data?.length ?? 0;

  signals.hasRevenueSignals =
    signals.overdueInvoiceCount > 0 ||
    signals.hasActiveRetainer ||
    signals.hasUpcomingMeeting ||
    signals.overdueMilestoneCount > 0 ||
    signals.cancelledMeetingsLast30d > 0;

  return signals;
}
