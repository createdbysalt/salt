/**
 * Signal Scanner Service
 *
 * Periodic scanner that detects signal-firing conditions across Memory entities
 * and dispatches to playbooks that declare those signals as triggers.
 *
 * Phase 2.7: This bridges the records-engine signal definitions with the
 * trigger-dispatch system. Signals are detected here and dispatched to
 * both keeper playbooks (profile rules) and acting playbooks (proposals).
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import {
  processBillingSignalTriggers,
  processMeetingSignalTriggers,
  processPersonSignalTriggers,
} from "@/app/_features/capture/services/play-triggers";

export interface SignalScanResult {
  workspaceId: string;
  billingScanned: number;
  billingSignalsFired: number;
  meetingsScanned: number;
  meetingSignalsFired: number;
  peopleScanned: number;
  personSignalsFired: number;
  playsCreated: number;
  errors: string[];
}

export interface SignalScanOptions {
  dryRun?: boolean;
}

/**
 * Scan billing records for overdue signals.
 * Fires `billing_due_date_passed` when due_date < now AND amount_paid < total.
 */
async function scanBillingSignals(
  workspaceId: string,
  options: SignalScanOptions
): Promise<{ scanned: number; fired: number; playsCreated: number; errors: string[] }> {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const errors: string[] = [];

  const { data: overdueRecords, error } = await admin
    .from("billing")
    .select("id, invoice_number, total, amount_paid, due_date, organization_id, person_id")
    .eq("workspace_id", workspaceId)
    .lt("due_date", now)
    .is("archived_at", null)
    .order("due_date", { ascending: true })
    .limit(100);

  if (error) {
    return { scanned: 0, fired: 0, playsCreated: 0, errors: [error.message] };
  }

  const records = overdueRecords ?? [];
  let fired = 0;
  let playsCreated = 0;

  for (const record of records) {
    const total = Number(record.total) || 0;
    const paid = Number(record.amount_paid) || 0;
    const amountDue = total - paid;

    if (amountDue <= 0) continue;

    fired++;

    if (options.dryRun) continue;

    try {
      const result = await processBillingSignalTriggers({
        workspaceId,
        billingId: record.id,
        billingLabel: record.invoice_number ?? `Invoice ${record.id.slice(0, 8)}`,
        signals: {
          billing_due_date_passed: true,
          billing_amount_paid_covers_total: false,
        },
      });
      playsCreated += result.playsCreated;
    } catch (err) {
      errors.push(`billing ${record.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { scanned: records.length, fired, playsCreated, errors };
}

/**
 * Scan meetings for completion signals.
 * Fires `meeting_end_passed` when end_time < now AND not already processed.
 */
async function scanMeetingSignals(
  workspaceId: string,
  options: SignalScanOptions
): Promise<{ scanned: number; fired: number; playsCreated: number; errors: string[] }> {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const errors: string[] = [];

  const { data: completedMeetings, error } = await admin
    .from("meetings")
    .select("id, title, end_time, attendees")
    .eq("workspace_id", workspaceId)
    .lt("end_time", now)
    .gt("end_time", oneDayAgo)
    .is("archived_at", null)
    .order("end_time", { ascending: false })
    .limit(50);

  if (error) {
    return { scanned: 0, fired: 0, playsCreated: 0, errors: [error.message] };
  }

  const meetings = completedMeetings ?? [];
  let fired = 0;
  let playsCreated = 0;

  for (const meeting of meetings) {
    fired++;

    if (options.dryRun) continue;

    try {
      const result = await processMeetingSignalTriggers({
        workspaceId,
        meetingId: meeting.id,
        meetingLabel: meeting.title ?? "Meeting",
        signals: {
          meeting_end_passed: true,
          meeting_has_attendance_evidence: Boolean(meeting.attendees),
        },
      });
      playsCreated += result.playsCreated;
    } catch (err) {
      errors.push(`meeting ${meeting.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { scanned: meetings.length, fired, playsCreated, errors };
}

/**
 * Scan people for silence signals.
 * Fires `person_no_contact_30_days` when last_contacted_at > 30 days ago.
 */
async function scanPersonSignals(
  workspaceId: string,
  options: SignalScanOptions
): Promise<{ scanned: number; fired: number; playsCreated: number; errors: string[] }> {
  const admin = createAdminClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const errors: string[] = [];

  const { data: silentPeople, error } = await admin
    .from("people")
    .select("id, display_name, last_contacted_at")
    .eq("workspace_id", workspaceId)
    .lt("last_contacted_at", thirtyDaysAgo)
    .is("archived_at", null)
    .order("last_contacted_at", { ascending: true })
    .limit(50);

  if (error) {
    return { scanned: 0, fired: 0, playsCreated: 0, errors: [error.message] };
  }

  const people = silentPeople ?? [];
  let fired = 0;
  let playsCreated = 0;

  for (const person of people) {
    fired++;

    if (options.dryRun) continue;

    try {
      const result = await processPersonSignalTriggers({
        workspaceId,
        personId: person.id,
        personLabel: person.display_name ?? "Contact",
        signals: {
          person_no_contact_30_days: true,
        },
      });
      playsCreated += result.playsCreated;
    } catch (err) {
      errors.push(`person ${person.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { scanned: people.length, fired, playsCreated, errors };
}

/**
 * Run a full signal scan for a workspace.
 * Detects signal-firing conditions and dispatches to playbooks.
 */
export async function runSignalScan(
  workspaceId: string,
  options: SignalScanOptions = {}
): Promise<SignalScanResult> {
  const result: SignalScanResult = {
    workspaceId,
    billingScanned: 0,
    billingSignalsFired: 0,
    meetingsScanned: 0,
    meetingSignalsFired: 0,
    peopleScanned: 0,
    personSignalsFired: 0,
    playsCreated: 0,
    errors: [],
  };

  const billing = await scanBillingSignals(workspaceId, options);
  result.billingScanned = billing.scanned;
  result.billingSignalsFired = billing.fired;
  result.playsCreated += billing.playsCreated;
  result.errors.push(...billing.errors);

  const meetings = await scanMeetingSignals(workspaceId, options);
  result.meetingsScanned = meetings.scanned;
  result.meetingSignalsFired = meetings.fired;
  result.playsCreated += meetings.playsCreated;
  result.errors.push(...meetings.errors);

  const people = await scanPersonSignals(workspaceId, options);
  result.peopleScanned = people.scanned;
  result.personSignalsFired = people.fired;
  result.playsCreated += people.playsCreated;
  result.errors.push(...people.errors);

  return result;
}

/**
 * Run signal scan across all active workspaces.
 */
export async function runSignalScanAllWorkspaces(
  options: SignalScanOptions = {}
): Promise<{ results: SignalScanResult[]; totalPlaysCreated: number }> {
  const admin = createAdminClient();

  const { data: workspaces, error } = await admin
    .from("workspaces")
    .select("id")
    .is("deleted_at", null)
    .limit(100);

  if (error || !workspaces) {
    return { results: [], totalPlaysCreated: 0 };
  }

  const results: SignalScanResult[] = [];
  let totalPlaysCreated = 0;

  for (const workspace of workspaces) {
    const result = await runSignalScan(workspace.id, options);
    results.push(result);
    totalPlaysCreated += result.playsCreated;
  }

  return { results, totalPlaysCreated };
}
