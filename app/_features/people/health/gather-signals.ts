import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { HealthSignals } from "./types";

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

function emptySignals(): HealthSignals {
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

export async function gatherHealthSignals(input: {
  supabase: SupabaseClient;
  personId: string;
  keyContactQuietThresholdDays?: number;
}): Promise<HealthSignals> {
  const now = Date.now();
  const thirtyDaysAgo = new Date(now - 30 * 86400000).toISOString();
  const sixtyDaysAgo = new Date(now - 60 * 86400000).toISOString();
  const thirtyDaysFromNow = new Date(now + 30 * 86400000).toISOString();
  const quietThresholdDays = input.keyContactQuietThresholdDays ?? 21;

  const signals = emptySignals();

  const [capturesResult, findingsResult, orgLinksResult] = await Promise.all([
    input.supabase
      .from("capture_events")
      .select("created_at, extracted_data")
      .eq("resolved_person_id", input.personId)
      .order("created_at", { ascending: false })
      .limit(200),
    input.supabase
      .from("intelligence_findings")
      .select("id", { count: "exact", head: true })
      .eq("person_id", input.personId),
    input.supabase
      .from("organization_people")
      .select("organization_id")
      .eq("person_id", input.personId),
  ]);

  const captures = capturesResult.data ?? [];
  signals.hasCaptureActivity = captures.length > 0;
  signals.intelligenceFindingCount = findingsResult.count ?? 0;

  if (captures.length > 0) {
    signals.lastActivityAt = captures[0]?.created_at as string;
  }

  for (const capture of captures) {
    const createdAt = capture.created_at as string;
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

  const orgIds = (orgLinksResult.data ?? [])
    .map((row) => row.organization_id as string | null)
    .filter(Boolean);

  if (orgIds.length > 0) {
    const { data: orgPeople } = await input.supabase
      .from("organization_people")
      .select("person_id")
      .in("organization_id", orgIds);

    const distinctContacts = new Set(
      (orgPeople ?? []).map((row) => row.person_id as string).filter(Boolean),
    );
    signals.orgContactCount = distinctContacts.size;

    if (signals.lastActivityAt) {
      const daysSinceContact =
        (now - new Date(signals.lastActivityAt).getTime()) / 86400000;
      signals.keyContactQuiet = daysSinceContact >= quietThresholdDays;
    }
  }

  // Revenue/meeting signals, keyed on person_id (previously keyed on the
  // dropped clients mapping — restored per derived-surfaces gap #3).
  const [
    overdueInvoicesResult,
    retainersResult,
    upcomingMeetingsResult,
    cancelledMeetingsResult,
    overdueMilestonesResult,
  ] = await Promise.all([
    input.supabase
      .from("billing_records")
      .select("id", { count: "exact", head: true })
      .eq("person_id", input.personId)
      .eq("direction", "receivable")
      .eq("status", "overdue"),
    input.supabase
      .from("work")
      .select("id")
      .eq("person_id", input.personId)
      .eq("work_type", "retainer")
      .in("status", ["signed", "active"])
      .limit(1),
    input.supabase
      .from("meetings")
      .select("id", { count: "exact", head: true })
      .eq("person_id", input.personId)
      .eq("status", "scheduled")
      .gte("start_time", new Date().toISOString())
      .lte("start_time", thirtyDaysFromNow),
    input.supabase
      .from("meetings")
      .select("id", { count: "exact", head: true })
      .eq("person_id", input.personId)
      .in("status", ["cancelled", "no-show"])
      .gte("created_at", thirtyDaysAgo),
    input.supabase
      .from("work")
      .select("id, milestones:project_milestones!inner(id, due_at, status)")
      .eq("person_id", input.personId)
      .lt("milestones.due_at", new Date().toISOString())
      .neq("milestones.status", "complete"),
  ]);

  signals.overdueInvoiceCount = overdueInvoicesResult.count ?? 0;
  signals.hasActiveRetainer = (retainersResult.data?.length ?? 0) > 0;
  signals.hasUpcomingMeeting = (upcomingMeetingsResult.count ?? 0) > 0;
  signals.cancelledMeetingsLast30d = cancelledMeetingsResult.count ?? 0;
  signals.overdueMilestoneCount = overdueMilestonesResult.data?.length ?? 0;

  signals.hasRevenueSignals =
    signals.overdueInvoiceCount > 0 ||
    signals.hasActiveRetainer ||
    signals.hasUpcomingMeeting ||
    signals.overdueMilestoneCount > 0 ||
    signals.cancelledMeetingsLast30d > 0;

  return signals;
}
