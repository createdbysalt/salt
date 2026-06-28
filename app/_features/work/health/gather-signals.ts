import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { WorkHealthSignals } from "./types";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export async function gatherWorkHealthSignals(input: {
  supabase: SupabaseClient;
  workspaceId: string;
  workId: string;
  clientId: string | null;
  status: string;
  workType: string | null;
  paymentType: string | null;
  stageEnteredAt: string | null;
  deadline: string | null;
  startDate: string | null;
  updatedAt: string | null;
  renewalDate: string | null;
  hoursEstimate: number | null;
  hoursLogged: number | null;
  hourlyRateCents: number | null;
  retainerMrrCents: number | null;
  contractValueCents: number | null;
}): Promise<WorkHealthSignals> {
  const now = new Date();
  const fourteenDaysAgo = new Date(now.getTime() - 14 * MS_PER_DAY);
  const twentyEightDaysAgo = new Date(now.getTime() - 28 * MS_PER_DAY);

  const signals: WorkHealthSignals = {
    status: input.status,
    workType: input.workType,
    paymentType: input.paymentType,
    stageEnteredAt: input.stageEnteredAt,
    deadline: input.deadline,
    startDate: input.startDate,
    updatedAt: input.updatedAt,
    linkedPeopleCount: 0,
    overdueInvoiceCount: 0,
    renewalDate: input.renewalDate,
    upcomingMeetingCount: 0,
    hoursEstimate: input.hoursEstimate,
    hoursLoggedTotal: input.hoursLogged,
    hoursLoggedLast14d: null,
    hoursLoggedPrior14d: null,
    lastInvoiceAt: null,
    lastContactAt: null,
    milestoneCount: 0,
    completedMilestoneCount: 0,
    overdueMilestoneCount: 0,
    budgetCents: input.contractValueCents,
    spentCents: null,
    blockerCount: 0,
    hasDecisionMakerEngaged: false,
    competingProposalCount: 0,
    clientConfirmed: false,
    isPaid: false,
    hourlyRateCents: input.hourlyRateCents,
    retainerMrrCents: input.retainerMrrCents,
  };

  const queries = await Promise.all([
    countLinkedPeople(input.supabase, input.workspaceId, input.workId),
    countMilestones(input.supabase, input.workspaceId, input.workId),
    countUpcomingMeetings(input.supabase, input.workspaceId, input.workId, now),
    getLastMeetingDate(input.supabase, input.workspaceId, input.workId, now),
    input.clientId
      ? getInvoiceSignals(input.supabase, input.clientId, input.workId, now)
      : null,
    getTimeEntrySignals(
      input.supabase,
      input.workId,
      fourteenDaysAgo,
      twentyEightDaysAgo,
    ),
    input.clientId && input.workType === "proposal"
      ? countCompetingProposals(input.supabase, input.workspaceId, input.clientId, input.workId)
      : 0,
    checkPrimaryContactEngaged(input.supabase, input.workspaceId, input.workId),
    countActiveBlockers(input.supabase, input.workspaceId, input.workId),
  ]);

  const [
    linkedPeopleCount,
    milestoneData,
    upcomingMeetingCount,
    lastMeetingAt,
    invoiceSignals,
    timeEntrySignals,
    competingProposalCount,
    hasDecisionMakerEngaged,
    blockerCount,
  ] = queries;

  signals.linkedPeopleCount = linkedPeopleCount;
  signals.milestoneCount = milestoneData.total;
  signals.completedMilestoneCount = milestoneData.completed;
  signals.overdueMilestoneCount = milestoneData.overdue;
  signals.upcomingMeetingCount = upcomingMeetingCount;
  signals.lastContactAt = lastMeetingAt;
  signals.competingProposalCount = competingProposalCount;
  signals.hasDecisionMakerEngaged = hasDecisionMakerEngaged;
  signals.blockerCount = blockerCount;

  if (invoiceSignals) {
    signals.overdueInvoiceCount = invoiceSignals.overdueCount;
    signals.lastInvoiceAt = invoiceSignals.lastInvoiceAt;
    signals.isPaid = invoiceSignals.allPaid;
    signals.spentCents = invoiceSignals.paidTotalCents;
  }

  if (timeEntrySignals) {
    signals.hoursLoggedLast14d = timeEntrySignals.last14d;
    signals.hoursLoggedPrior14d = timeEntrySignals.prior14d;
  }

  return signals;
}

async function countLinkedPeople(
  supabase: SupabaseClient,
  workspaceId: string,
  workId: string,
): Promise<number> {
  const { count } = await supabase
    .from("entity_relations")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .or(
      `and(from_entity_type.in.(work,project),from_entity_id.eq.${workId},to_entity_type.eq.person),and(to_entity_type.in.(work,project),to_entity_id.eq.${workId},from_entity_type.eq.person)`,
    );

  return count ?? 0;
}

async function countMilestones(
  supabase: SupabaseClient,
  workspaceId: string,
  workId: string,
): Promise<{ total: number; completed: number; overdue: number }> {
  const { data } = await supabase
    .from("work_milestones")
    .select("status, trigger_type, trigger_stage, due_date")
    .eq("workspace_id", workspaceId)
    .eq("work_id", workId);

  if (!data) return { total: 0, completed: 0, overdue: 0 };

  const now = new Date();
  let overdue = 0;

  for (const m of data) {
    if (m.status === "paid" || m.status === "skipped") continue;
    if (m.trigger_type === "date" && m.due_date) {
      const dueDate = new Date(m.due_date);
      if (dueDate < now) overdue++;
    }
  }

  return {
    total: data.length,
    completed: data.filter((m) => m.status === "paid").length,
    overdue,
  };
}

async function countUpcomingMeetings(
  supabase: SupabaseClient,
  workspaceId: string,
  workId: string,
  now: Date,
): Promise<number> {
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * MS_PER_DAY);

  const { count } = await supabase
    .from("client_meetings")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("project_id", workId)
    .eq("status", "scheduled")
    .gte("start_time", now.toISOString())
    .lte("start_time", thirtyDaysFromNow.toISOString());

  return count ?? 0;
}

async function getLastMeetingDate(
  supabase: SupabaseClient,
  workspaceId: string,
  workId: string,
  now: Date,
): Promise<string | null> {
  const { data } = await supabase
    .from("client_meetings")
    .select("start_time")
    .eq("workspace_id", workspaceId)
    .eq("project_id", workId)
    .in("status", ["completed", "scheduled"])
    .lt("start_time", now.toISOString())
    .order("start_time", { ascending: false })
    .limit(1)
    .single();

  return data?.start_time ?? null;
}

async function getInvoiceSignals(
  supabase: SupabaseClient,
  clientId: string,
  workId: string,
  now: Date,
): Promise<{
  overdueCount: number;
  lastInvoiceAt: string | null;
  allPaid: boolean;
  paidTotalCents: number;
}> {
  const { data: invoices } = await supabase
    .from("portal_invoices")
    .select("status, due_date, sent_at, paid_at, amount_cents")
    .eq("client_id", clientId)
    .eq("project_id", workId);

  if (!invoices || invoices.length === 0) {
    return { overdueCount: 0, lastInvoiceAt: null, allPaid: true, paidTotalCents: 0 };
  }

  const nowDate = now.toISOString().split("T")[0];
  let overdueCount = 0;
  let lastInvoiceAt: string | null = null;
  let allPaid = true;
  let paidTotalCents = 0;

  for (const inv of invoices) {
    if (inv.status === "paid") {
      paidTotalCents += inv.amount_cents ?? 0;
    } else if (inv.status !== "canceled" && inv.status !== "draft") {
      allPaid = false;
      if (inv.due_date && inv.due_date < nowDate) {
        overdueCount++;
      }
    }

    if (inv.sent_at) {
      if (!lastInvoiceAt || inv.sent_at > lastInvoiceAt) {
        lastInvoiceAt = inv.sent_at;
      }
    }
  }

  return { overdueCount, lastInvoiceAt, allPaid, paidTotalCents };
}

async function getTimeEntrySignals(
  supabase: SupabaseClient,
  workId: string,
  fourteenDaysAgo: Date,
  twentyEightDaysAgo: Date,
): Promise<{ last14d: number; prior14d: number } | null> {
  const { data } = await supabase
    .from("retainer_time_entries")
    .select("work_date, hours")
    .eq("project_id", workId)
    .gte("work_date", twentyEightDaysAgo.toISOString().split("T")[0]);

  if (!data || data.length === 0) return null;

  const fourteenDaysAgoStr = fourteenDaysAgo.toISOString().split("T")[0];
  let last14d = 0;
  let prior14d = 0;

  for (const entry of data) {
    const hours = Number(entry.hours) || 0;
    if (entry.work_date >= fourteenDaysAgoStr) {
      last14d += hours;
    } else {
      prior14d += hours;
    }
  }

  return { last14d, prior14d };
}

async function countCompetingProposals(
  supabase: SupabaseClient,
  workspaceId: string,
  clientId: string,
  currentWorkId: string,
): Promise<number> {
  const { count } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("client_id", clientId)
    .eq("work_type", "proposal")
    .eq("status", "active")
    .neq("id", currentWorkId);

  return count ?? 0;
}

async function checkPrimaryContactEngaged(
  supabase: SupabaseClient,
  workspaceId: string,
  workId: string,
): Promise<boolean> {
  const { count } = await supabase
    .from("entity_relations")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .or(
      `and(from_entity_type.in.(work,project),from_entity_id.eq.${workId},to_entity_type.eq.person),and(to_entity_type.in.(work,project),to_entity_id.eq.${workId},from_entity_type.eq.person)`,
    );

  return (count ?? 0) > 0;
}

async function countActiveBlockers(
  supabase: SupabaseClient,
  workspaceId: string,
  workId: string,
): Promise<number> {
  const { count } = await supabase
    .from("work_blockers")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("work_id", workId)
    .eq("status", "active");

  return count ?? 0;
}
