import "server-only";

/**
 * Memory fetch source for the v2 playbook executor.
 *
 * "memory" is not a connector category — it's Salt's own Memory tables
 * (people, work, blockers). Playbooks like follow-up, relationship-health,
 * and blocker-watch fetch from it via `fetch from: memory.<capability>`,
 * which the executor routes here instead of through the Composio category
 * fetcher. No connected-category requirement applies.
 *
 * Capabilities:
 * - person_context: one person with relationship context. Signal-scoped —
 *   resolves the person from the triggering entity id.
 * - silent_relationships: people whose last_contact_at is older than
 *   `where.days_since_contact` (default 30).
 * - silent_30d: same query, fixed at 30 days (HQ daily briefing).
 * - work_blocked: unresolved work blockers. Signal-scoped to a work entity
 *   returns a single object; otherwise returns the list.
 * - billing_record_context: one billing record with its client, the client's
 *   payment history, and every open receivable for that client. Signal-scoped
 *   to a billing entity (e.g. billing_due_date_passed).
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { sanitizePayUrl } from "@/app/_features/plays/lib/draft-payment-link";

export interface MemoryFetchEntityContext {
  entityId?: string;
  entitySurface?: string;
}

export function isMemoryFetchCategory(category: string): boolean {
  return category === "memory";
}

export async function fetchMemorySource(
  workspaceId: string,
  capability: string,
  where: Record<string, unknown> | undefined,
  entity: MemoryFetchEntityContext
): Promise<unknown> {
  switch (capability) {
    case "person_context":
      return fetchPersonContext(workspaceId, entity);
    case "silent_relationships":
      return fetchSilentRelationships(workspaceId, daysFrom(where, 30));
    case "silent_30d":
      return fetchSilentRelationships(workspaceId, 30);
    case "work_blocked":
      return fetchWorkBlocked(workspaceId, entity);
    case "billing_record_context":
      return fetchBillingRecordContext(workspaceId, entity);
    case "file_context":
      return fetchFileContext(workspaceId, entity);
    default:
      throw new Error(`Unknown memory capability "${capability}"`);
  }
}

function daysFrom(
  where: Record<string, unknown> | undefined,
  fallback: number
): number {
  const raw = where?.days_since_contact;
  return typeof raw === "number" && raw > 0 ? raw : fallback;
}

export interface PersonContext {
  id: string;
  name: string;
  email: string | null;
  relationship_type: string | null;
  relationship_status: string | null;
  last_contact_at: string | null;
  first_contact_at: string | null;
  recent_notes: string | null;
  health_band: string | null;
  health_score: number | null;
  has_calendar_meeting: boolean;
}

/**
 * Single-object result (not an array) so templates can reference
 * `{{contact_context.name}}` and classify rules test fields directly.
 */
async function fetchPersonContext(
  workspaceId: string,
  entity: MemoryFetchEntityContext
): Promise<PersonContext> {
  if (entity.entitySurface !== "person" || !entity.entityId) {
    throw new Error(
      "memory.person_context requires a person entity in the trigger context"
    );
  }

  const admin = createAdminClient();
  const { data: person, error } = await admin
    .from("people")
    .select(
      "id, name, email, relationship_type, relationship_status, last_contact_at, first_contact_at, notes, relationship_health_band, relationship_health_score"
    )
    .eq("id", entity.entityId)
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load person ${entity.entityId}: ${error.message}`);
  }
  if (!person) {
    throw new Error(`Person ${entity.entityId} not found in workspace`);
  }

  const { count: meetingCount } = await admin
    .from("meetings")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("person_id", person.id as string)
    .is("deleted_at", null)
    .limit(1);

  return {
    id: person.id as string,
    name: person.name as string,
    email: (person.email as string) ?? null,
    relationship_type: (person.relationship_type as string) ?? null,
    relationship_status: (person.relationship_status as string) ?? null,
    last_contact_at: (person.last_contact_at as string) ?? null,
    first_contact_at: (person.first_contact_at as string) ?? null,
    recent_notes: (person.notes as string) ?? null,
    health_band: (person.relationship_health_band as string) ?? null,
    health_score: (person.relationship_health_score as number) ?? null,
    has_calendar_meeting: (meetingCount ?? 0) > 0,
  };
}

export interface SilentRelationship {
  id: string;
  name: string;
  relationship_type: string | null;
  last_contact_at: string | null;
  days_since_contact: number | null;
}

async function fetchSilentRelationships(
  workspaceId: string,
  days: number
): Promise<SilentRelationship[]> {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("people")
    .select("id, name, relationship_type, last_contact_at")
    .eq("workspace_id", workspaceId)
    .lt("last_contact_at", cutoff.toISOString())
    .is("archived_at", null)
    .is("deleted_at", null)
    .order("last_contact_at", { ascending: true })
    .limit(25);

  if (error) {
    throw new Error(`Failed to load silent relationships: ${error.message}`);
  }

  const now = Date.now();
  return (data ?? []).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    relationship_type: (row.relationship_type as string) ?? null,
    last_contact_at: (row.last_contact_at as string) ?? null,
    days_since_contact: row.last_contact_at
      ? Math.floor(
          (now - new Date(row.last_contact_at as string).getTime()) /
            (24 * 60 * 60 * 1000)
        )
      : null,
  }));
}

export interface BlockedWorkItem {
  id: string;
  name: string;
  blocker_reason: string;
  blocker_type: string;
  blocked_since: string;
}

/**
 * Signal-scoped (work entity in trigger context): the blocked work item as a
 * single object so `{{blocked_work.name}}` resolves. Otherwise the workspace's
 * unresolved blockers as a list.
 */
async function fetchWorkBlocked(
  workspaceId: string,
  entity: MemoryFetchEntityContext
): Promise<BlockedWorkItem | BlockedWorkItem[]> {
  const admin = createAdminClient();

  const scopedWorkId =
    entity.entitySurface === "work" ? entity.entityId : undefined;

  const base = admin
    .from("work_blockers")
    .select("work_id, title, blocker_type, detail, detected_at, work:work_id(title)")
    .eq("workspace_id", workspaceId)
    .is("resolved_at", null);

  const filtered = scopedWorkId ? base.eq("work_id", scopedWorkId) : base;

  const { data, error } = await filtered
    .order("detected_at", { ascending: false })
    .limit(25);
  if (error) {
    throw new Error(`Failed to load blocked work: ${error.message}`);
  }

  const items: BlockedWorkItem[] = (data ?? []).map((row) => {
    const work = row.work as { title?: string } | null;
    return {
      id: row.work_id as string,
      name: work?.title ?? "Work item",
      blocker_reason: (row.detail as string) ?? (row.title as string),
      blocker_type: row.blocker_type as string,
      blocked_since: row.detected_at as string,
    };
  });

  if (scopedWorkId) {
    const first = items[0];
    if (!first) {
      throw new Error(
        `Work ${scopedWorkId} has no unresolved blocker (signal may be stale)`
      );
    }
    return first;
  }

  return items;
}

export interface BillingRecordContext {
  invoice: {
    id: string;
    number: string | null;
    status: string;
    amount_cents: number;
    amount_paid_cents: number;
    amount_remaining_cents: number;
    currency: string;
    due_at: string | null;
    days_overdue: number | null;
    /** Hosted pay page only. Omitted when we do not have one. */
    pay_url: string | null;
  };
  client: { id: string; name: string; email: string | null; kind: "person" | "organization" } | null;
  payment_history: { on_time: number; late: number };
  /** Every open receivable for the same client, including the signaled one. */
  open_invoices: Array<{
    id: string;
    number: string | null;
    status: string;
    amount_remaining_cents: number;
    due_at: string | null;
    days_overdue: number | null;
    pay_url: string | null;
  }>;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function daysOverdue(dueAt: string | null, now: number): number | null {
  if (!dueAt) return null;
  const days = Math.floor((now - new Date(dueAt).getTime()) / DAY_MS);
  return days > 0 ? days : 0;
}

/**
 * Single-object result (like person_context) so templates can reference
 * `{{invoice_context.invoice.number}}` and classify rules test fields
 * directly. Signal-scoped: resolves the billing record from the trigger.
 */
async function fetchBillingRecordContext(
  workspaceId: string,
  entity: MemoryFetchEntityContext
): Promise<BillingRecordContext> {
  if (entity.entitySurface !== "billing" || !entity.entityId) {
    throw new Error(
      "memory.billing_record_context requires a billing entity in the trigger context"
    );
  }

  const admin = createAdminClient();
  const now = Date.now();

  const { data: record, error } = await admin
    .from("billing_records")
    .select(
      "id, number, status, amount_cents, amount_paid_cents, currency, due_at, person_id, organization_id, app_url"
    )
    .eq("id", entity.entityId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load billing record ${entity.entityId}: ${error.message}`);
  }
  if (!record) {
    throw new Error(`Billing record ${entity.entityId} not found in workspace`);
  }

  let client: BillingRecordContext["client"] = null;
  if (record.person_id) {
    const { data: person } = await admin
      .from("people")
      .select("id, name, email")
      .eq("id", record.person_id as string)
      .maybeSingle();
    if (person) {
      client = {
        id: person.id as string,
        name: person.name as string,
        email: (person.email as string) ?? null,
        kind: "person",
      };
    }
  } else if (record.organization_id) {
    const { data: org } = await admin
      .from("organizations")
      .select("id, name")
      .eq("id", record.organization_id as string)
      .maybeSingle();
    if (org) {
      client = {
        id: org.id as string,
        name: org.name as string,
        email: null,
        kind: "organization",
      };
    }
  }

  const payment_history = { on_time: 0, late: 0 };
  const open_invoices: BillingRecordContext["open_invoices"] = [];

  if (record.person_id || record.organization_id) {
    let historyQuery = admin
      .from("billing_records")
      .select("id, number, status, amount_cents, amount_paid_cents, due_at, paid_at, app_url")
      .eq("workspace_id", workspaceId)
      .eq("direction", "receivable");
    historyQuery = record.person_id
      ? historyQuery.eq("person_id", record.person_id as string)
      : historyQuery.eq("organization_id", record.organization_id as string);

    const { data: history, error: historyError } = await historyQuery;
    if (historyError) {
      throw new Error(`Failed to load client billing history: ${historyError.message}`);
    }

    for (const row of history ?? []) {
      const status = row.status as string;
      if (status === "paid" && row.paid_at && row.due_at) {
        if (new Date(row.paid_at as string) <= new Date(row.due_at as string)) {
          payment_history.on_time++;
        } else {
          payment_history.late++;
        }
      }
      if (status === "due" || status === "overdue" || status === "partial") {
        open_invoices.push({
          id: row.id as string,
          number: (row.number as string) ?? null,
          status,
          amount_remaining_cents:
            (row.amount_cents as number) - (row.amount_paid_cents as number),
          due_at: (row.due_at as string) ?? null,
          days_overdue: daysOverdue((row.due_at as string) ?? null, now),
          pay_url: sanitizePayUrl((row.app_url as string) ?? null),
        });
      }
    }
  }

  return {
    invoice: {
      id: record.id as string,
      number: (record.number as string) ?? null,
      status: record.status as string,
      amount_cents: record.amount_cents as number,
      amount_paid_cents: record.amount_paid_cents as number,
      amount_remaining_cents:
        (record.amount_cents as number) - (record.amount_paid_cents as number),
      currency: record.currency as string,
      due_at: (record.due_at as string) ?? null,
      days_overdue: daysOverdue((record.due_at as string) ?? null, now),
      pay_url: sanitizePayUrl((record.app_url as string) ?? null),
    },
    client,
    payment_history,
    open_invoices,
  };
}

export interface FileContext {
  id: string;
  file_name: string;
  category: string | null;
  document_type: string | null;
  description: string | null;
  /** AI summary of the file's contents, when extraction has run. */
  ai_summary: string | null;
  external_url: string | null;
  /** Storage provider the file came from (google_drive, dropbox, upload…). */
  provider: string | null;
  signed_date: string | null;
  /** Linked counterparty — who the pushback email would go to. */
  counterparty: { id: string; name: string; email: string | null } | null;
  counterparty_org: { id: string; name: string } | null;
}

/**
 * Single-object result (like person_context) so templates can reference
 * `{{file_context.file_name}}` and classify rules test fields directly.
 * Signal-scoped: resolves the resource from the trigger.
 */
async function fetchFileContext(
  workspaceId: string,
  entity: MemoryFetchEntityContext
): Promise<FileContext> {
  if (entity.entitySurface !== "resource" || !entity.entityId) {
    throw new Error(
      "memory.file_context requires a resource entity in the trigger context"
    );
  }

  const admin = createAdminClient();
  const { data: file, error } = await admin
    .from("resources")
    .select(
      "id, file_name, category, document_type, description, ai_summary, external_url, provider, signed_date, person_id, organization_id"
    )
    .eq("id", entity.entityId)
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load resource ${entity.entityId}: ${error.message}`);
  }
  if (!file) {
    throw new Error(`Resource ${entity.entityId} not found in workspace`);
  }

  let counterparty: FileContext["counterparty"] = null;
  if (file.person_id) {
    const { data: person } = await admin
      .from("people")
      .select("id, name, email")
      .eq("id", file.person_id as string)
      .maybeSingle();
    if (person) {
      counterparty = {
        id: person.id as string,
        name: person.name as string,
        email: (person.email as string) ?? null,
      };
    }
  }

  let counterpartyOrg: FileContext["counterparty_org"] = null;
  if (file.organization_id) {
    const { data: org } = await admin
      .from("organizations")
      .select("id, name")
      .eq("id", file.organization_id as string)
      .maybeSingle();
    if (org) {
      counterpartyOrg = { id: org.id as string, name: org.name as string };
    }
  }

  return {
    id: file.id as string,
    file_name: file.file_name as string,
    category: (file.category as string) ?? null,
    document_type: (file.document_type as string) ?? null,
    description: (file.description as string) ?? null,
    ai_summary: (file.ai_summary as string) ?? null,
    external_url: (file.external_url as string) ?? null,
    provider: (file.provider as string) ?? null,
    signed_date: (file.signed_date as string) ?? null,
    counterparty,
    counterparty_org: counterpartyOrg,
  };
}
