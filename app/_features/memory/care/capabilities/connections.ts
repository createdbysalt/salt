/**
 * Memory Care — Connections capability
 *
 * Two responsibilities:
 *
 * 1. INFERENCE (signal-triggered): when a capture signal arrives for an
 *    entity, infer or strengthen entity connections through the protected
 *    memoryLinkEntities tool:
 *    - person + email signal  → person↔org (works_at) from email domain
 *    - meeting completed      → attendee people ↔ meeting (attendee)
 *    - billing payment match  → person↔org (billing_contact)
 *
 * 2. HEALTH (scheduled, weekly): scan client relationships for staleness
 *    and emit at-risk evidence to Watching.
 *
 * Ported from the retired connections system playbook.
 */

import "server-only";

import { createAdminClient } from "@/app/_lib/supabase/admin";
import {
  memoryLinkEntities,
  type LearningEntityType,
} from "@/app/_lib/memory-tools";
import {
  extractDomain,
  isPersonalDomain,
} from "@/app/_features/memory/records/person-signals";
import type { CareRunContext, CareRunResult } from "../types";

const STALE_WARNING_DAYS = 30;
const STALE_CRITICAL_DAYS = 60;

export async function runConnectionsCapability(
  ctx: CareRunContext
): Promise<CareRunResult> {
  const { workspaceId } = ctx;

  if (!workspaceId) {
    return { success: false, error: "No workspace context" };
  }

  if (ctx.entityType && ctx.entityId) {
    return runInference(
      workspaceId,
      ctx.entityType as LearningEntityType,
      ctx.entityId
    );
  }

  return runHealthScan(workspaceId);
}

// ============================================================================
// Inference (signal-triggered)
// ============================================================================

async function runInference(
  workspaceId: string,
  entityType: LearningEntityType,
  entityId: string
): Promise<CareRunResult> {
  let inferred = 0;

  switch (entityType) {
    case "person":
      inferred = await inferPersonOrgLink(workspaceId, entityId);
      break;
    case "meeting":
      inferred = await linkMeetingAttendees(workspaceId, entityId);
      break;
    case "billing":
      inferred = await linkBillingContact(workspaceId, entityId);
      break;
    default:
      return { success: true, skipped: `no_inference_for_${entityType}` };
  }

  return {
    success: true,
    summary:
      inferred > 0
        ? `Inferred ${inferred} connection(s) for ${entityType}`
        : `No new connections for ${entityType}`,
    data: { entityType, connectionsInferred: inferred, updates: inferred },
  };
}

/**
 * Person↔Org from email domain: if the person's email domain matches an
 * existing organization and no junction link exists, create works_at.
 */
async function inferPersonOrgLink(
  workspaceId: string,
  personId: string
): Promise<number> {
  const admin = createAdminClient();

  const { data: person } = await admin
    .from("people")
    .select("id, email")
    .eq("id", personId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (!person?.email) return 0;

  const domain = extractDomain(person.email);
  if (!domain || isPersonalDomain(person.email)) return 0;

  const { data: existingLink } = await admin
    .from("organization_people")
    .select("id")
    .eq("person_id", personId)
    .limit(1)
    .maybeSingle();

  if (existingLink) return 0;

  const { data: org } = await admin
    .from("organizations")
    .select("id, name")
    .eq("workspace_id", workspaceId)
    .eq("domain", domain)
    .is("deleted_at", null)
    .is("archived_at", null)
    .maybeSingle();

  if (!org) return 0;

  const result = await memoryLinkEntities({
    workspaceId,
    sourceType: "person",
    sourceId: personId,
    targetType: "organization",
    targetId: org.id,
    relationType: "works_at",
    confidence: 75,
    because: `Email domain ${domain} matches ${org.name ?? "organization"}`,
  });

  return result.success ? 1 : 0;
}

/**
 * Person↔Meeting: link workspace people matching the meeting's attendee
 * emails as attendees.
 */
async function linkMeetingAttendees(
  workspaceId: string,
  meetingId: string
): Promise<number> {
  const admin = createAdminClient();

  const { data: meeting } = await admin
    .from("meetings")
    .select("id, attendees")
    .eq("id", meetingId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (!meeting) return 0;

  const attendeeEmails = extractAttendeeEmails(meeting.attendees);
  if (attendeeEmails.length === 0) return 0;

  const { data: people } = await admin
    .from("people")
    .select("id, email")
    .eq("workspace_id", workspaceId)
    .in("email", attendeeEmails)
    .is("deleted_at", null);

  let linked = 0;
  for (const person of people ?? []) {
    const result = await memoryLinkEntities({
      workspaceId,
      sourceType: "person",
      sourceId: person.id,
      targetType: "meeting",
      targetId: meetingId,
      relationType: "attendee",
      confidence: 95,
      because: "Listed as meeting attendee",
    });
    if (result.success) linked++;
  }

  return linked;
}

function extractAttendeeEmails(attendees: unknown): string[] {
  if (!Array.isArray(attendees)) return [];
  const emails: string[] = [];
  for (const attendee of attendees) {
    if (typeof attendee === "string" && attendee.includes("@")) {
      emails.push(attendee.toLowerCase().trim());
    } else if (
      typeof attendee === "object" &&
      attendee !== null &&
      typeof (attendee as { email?: unknown }).email === "string"
    ) {
      emails.push((attendee as { email: string }).email.toLowerCase().trim());
    }
  }
  return [...new Set(emails)];
}

/**
 * Billing payment matched: mark the payer person as billing contact of the
 * billing record's organization.
 */
async function linkBillingContact(
  workspaceId: string,
  billingId: string
): Promise<number> {
  const admin = createAdminClient();

  const { data: billing } = await admin
    .from("billing_records")
    .select("id, person_id, organization_id")
    .eq("id", billingId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (!billing?.person_id || !billing.organization_id) return 0;

  const result = await memoryLinkEntities({
    workspaceId,
    sourceType: "person",
    sourceId: billing.person_id,
    targetType: "organization",
    targetId: billing.organization_id,
    relationType: "billing_contact",
    confidence: 90,
    because: "Person is billing contact for a matched payment",
  });

  return result.success ? 1 : 0;
}

// ============================================================================
// Health (scheduled)
// ============================================================================

/**
 * Weekly relationship health scan: clients silent for 30+/60+ days become
 * `revenue_risk` findings in HQ Heads up (30d = stale, 60d = critical).
 *
 * Founder call 2026-08-08: at-risk clients are act-layer attention items,
 * not Memory field proposals — they never belonged in Watching (which shows
 * only concrete (field, value) proposals).
 */
async function runHealthScan(workspaceId: string): Promise<CareRunResult> {
  const admin = createAdminClient();
  const now = Date.now();
  const warningCutoff = new Date(
    now - STALE_WARNING_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data: staleClients, error } = await admin
    .from("people")
    .select("id, name, last_contact_at")
    .eq("workspace_id", workspaceId)
    .eq("relationship_type", "client")
    .lt("last_contact_at", warningCutoff)
    .is("deleted_at", null)
    .is("archived_at", null)
    .limit(50);

  if (error) {
    return { success: false, error: `Health scan failed: ${error.message}` };
  }

  let emitted = 0;
  for (const client of staleClients ?? []) {
    if (!client.last_contact_at) continue;

    const daysSinceContact = Math.floor(
      (now - new Date(client.last_contact_at).getTime()) / (24 * 60 * 60 * 1000)
    );
    const critical = daysSinceContact >= STALE_CRITICAL_DAYS;

    // Dedupe: one open at-risk finding per client — the weekly scan must not
    // stack a new card every run while the client stays quiet.
    const { data: existing } = await admin
      .from("intelligence_findings")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("person_id", client.id)
      .eq("finding_type", "revenue_risk")
      .eq("state", "needs_you")
      .limit(1)
      .maybeSingle();

    if (existing?.id) continue;

    const clientName = client.name?.trim() || "A client";
    const { data: finding, error: findingError } = await admin
      .from("intelligence_findings")
      .insert({
        workspace_id: workspaceId,
        person_id: client.id,
        finding_type: "revenue_risk",
        title: `${clientName} has gone quiet`,
        content: `No contact in ${daysSinceContact} days — the relationship is ${critical ? "critically" : "getting"} stale.`,
        confidence: critical ? 95 : 90,
        state: "needs_you",
        evidence: {
          source_type: "memory-care",
          capability: "connections",
          health_status: critical ? "critical" : "stale",
          days_since_contact: daysSinceContact,
          last_contact_at: client.last_contact_at,
        },
      })
      .select("id")
      .single();

    if (findingError) {
      console.error(
        `[memory-care:connections] Failed to create at-risk finding for ${client.id}:`,
        findingError.message
      );
      continue;
    }

    if (finding?.id) emitted++;
  }

  return {
    success: true,
    summary:
      emitted > 0
        ? `Flagged ${emitted} at-risk client relationship(s)`
        : "All client relationships healthy",
    data: { clientsScanned: (staleClients ?? []).length, emitted },
  };
}
