import type { ActivityEvent, SourceKind } from "@/app/_lib/demo/people-demo-data";
import type {
  BillingDirection,
  BillingExtraction,
  BillingOrigin,
  BillingProvider,
  BillingRecord,
  BillingRecurrence,
  BillingStatus,
  PayableCategory,
} from "../data";

// Any RFC-shaped hex UUID (8-4-4-4-12). Postgres accepts all of these, and
// the guard's job is PostgREST .or() injection safety, not version policing —
// the old [1-5]/[89ab] variant check rejected v7 ids and nil-style uuids.
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isBillingUuid(value: string | undefined | null): value is string {
  return Boolean(value && UUID_REGEX.test(value));
}

/** Stable dedupe key for manual / Ask Salt billing intake (per workspace). */
export function buildManualBillingSourceExternalId(input: {
  direction: BillingDirection;
  number: string;
}): string {
  const normalized = input.number.trim().toLowerCase().replace(/\s+/g, "-");
  return `manual:${input.direction}:${normalized}`;
}

type BillingLineItemRow = {
  description?: string;
  amountCents?: number;
};

type BillingWorthAttentionRow = {
  reason?: string;
  suggestedPlay?: string;
};

type BillingMetadataRow = {
  pending_org_name?: string;
  pending_person_name?: string;
  pending_person_subtitle?: string;
  pending_work_title?: string;
  activity?: ActivityEvent[];
  retainer_tier?: string;
  mrr_cents?: number;
  /** User overrode a Salt extraction to treat the record as manually added */
  source_reclassified_as_manual?: boolean;
};

export type BillingRecordRow = {
  id: string;
  workspace_id: string;
  direction: BillingDirection;
  number: string | null;
  status: BillingStatus;
  amount_cents: number;
  amount_paid_cents: number;
  currency: string;
  issued_at: string | null;
  due_at: string | null;
  paid_at: string | null;
  organization_id: string | null;
  person_id: string | null;
  project_id: string | null;
  vendor_label: string | null;
  category: PayableCategory | null;
  provider: BillingProvider;
  source: SourceKind;
  origin: BillingOrigin;
  capture_event_id: string | null;
  source_external_id: string | null;
  app_url: string | null;
  line_items: BillingLineItemRow[] | null;
  tags: string[] | null;
  worth_attention: BillingWorthAttentionRow | null;
  recurrence_series_id: string | null;
  recurrence_cadence: BillingRecurrence["cadence"] | null;
  recurrence_next_at: string | null;
  extraction: BillingExtraction | null;
  duplicate_of: string | null;
  metadata: BillingMetadataRow | null;
  created_at: string;
  updated_at: string;
};

type BillingOrganizationJoin = { id: string; name: string } | null;
type BillingPersonJoin = { id: string; name: string; title: string | null } | null;
type BillingProjectJoin = { id: string; name: string } | null;

export type BillingRecordQueryRow = BillingRecordRow & {
  organizations?: BillingOrganizationJoin;
  people?: BillingPersonJoin;
  projects?: BillingProjectJoin;
};

function parseLineItems(value: BillingLineItemRow[] | null): BillingRecord["lineItems"] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => typeof item.description === "string" && typeof item.amountCents === "number")
    .map((item) => ({
      description: item.description as string,
      amountCents: item.amountCents as number,
    }));
}

function defaultActivity(row: BillingRecordRow, providerLabel: string): ActivityEvent[] {
  const metadata = (row.metadata ?? {}) as BillingMetadataRow;
  if (Array.isArray(metadata.activity) && metadata.activity.length > 0) {
    return metadata.activity;
  }

  return [
    {
      id: `${row.id}-created`,
      at: row.created_at,
      kind: row.origin === "found" ? "system" : "user",
      label:
        row.origin === "found"
          ? `Record found in ${providerLabel}`
          : "Record added to Billing Memory",
      detail:
        row.origin === "found"
          ? "Salt synced this billing record from a connected finance app."
          : "Salt prepared this record from Ask Salt or an uploaded document.",
    },
  ];
}

function recurrenceFromRow(row: BillingRecordRow): BillingRecurrence | undefined {
  if (!row.recurrence_series_id || !row.recurrence_cadence) return undefined;
  return {
    seriesId: row.recurrence_series_id,
    cadence: row.recurrence_cadence,
    nextAt: row.recurrence_next_at ?? undefined,
  };
}

export function mapBillingRecordRow(row: BillingRecordQueryRow): BillingRecord {
  const metadata = (row.metadata ?? {}) as BillingMetadataRow;
  const organization = row.organizations ?? null;
  const person = row.people ?? null;
  const project = row.projects ?? null;

  const org =
    organization != null
      ? { id: organization.id, name: organization.name }
      : metadata.pending_org_name
        ? { id: "pending", name: metadata.pending_org_name }
        : row.direction === "receivable" && row.vendor_label
          ? { id: "pending", name: row.vendor_label }
          : undefined;

  const billTo =
    person != null
      ? {
          kind: "person" as const,
          id: person.id,
          name: person.name,
          subtitle: person.title ?? undefined,
        }
      : metadata.pending_person_name
        ? {
            kind: "person" as const,
            id: "pending",
            name: metadata.pending_person_name,
            subtitle: metadata.pending_person_subtitle,
          }
        : undefined;

  const payTo =
    row.direction === "payable" && person != null
      ? {
          kind: "person" as const,
          id: person.id,
          name: person.name,
          subtitle: person.title ?? undefined,
        }
      : undefined;

  const work =
    project != null
      ? { id: project.id, title: project.name }
      : metadata.pending_work_title
        ? { id: "pending", title: metadata.pending_work_title }
        : undefined;

  return {
    id: row.id,
    direction: row.direction,
    number: row.number ?? "Untitled",
    amountCents: row.amount_cents,
    amountPaidCents: row.amount_paid_cents,
    currency: row.currency.toUpperCase(),
    status: row.status,
    dueAt: row.due_at ?? row.created_at,
    issuedAt: row.issued_at ?? row.created_at,
    paidAt: row.paid_at ?? undefined,
    org,
    billTo,
    payTo,
    vendorLabel: row.vendor_label ?? undefined,
    work,
    category: row.category ?? undefined,
    lineItems: parseLineItems(row.line_items),
    activity: defaultActivity(row, row.provider),
    worthAttention: row.worth_attention
      ? {
          reason: row.worth_attention.reason ?? "Review this billing record.",
          suggestedPlay: row.worth_attention.suggestedPlay,
        }
      : undefined,
    source: row.source,
    provider: row.provider,
    origin: row.origin,
    sourceExternalId: row.source_external_id ?? undefined,
    captureId: row.capture_event_id ?? undefined,
    appUrl: row.app_url ?? undefined,
    recurrence: recurrenceFromRow(row),
    extraction: row.extraction ?? undefined,
    duplicateOf: row.duplicate_of ?? undefined,
    tags: row.tags ?? [],
    sourceReclassifiedAsManual: metadata.source_reclassified_as_manual ?? false,
    retainerTier: metadata.retainer_tier,
    mrrCents: metadata.mrr_cents,
  };
}

export function draftToInsertRow(input: {
  workspaceId: string;
  userId: string;
  draft: import("../actions/billing-record-draft").BillingRecordDraft;
}) {
  const { draft, workspaceId, userId } = input;
  const now = new Date().toISOString();
  const metadata: BillingMetadataRow = {};

  if (draft.org && !isBillingUuid(draft.org.id)) {
    metadata.pending_org_name = draft.org.name;
  }
  if (draft.billTo && !isBillingUuid(draft.billTo.id)) {
    metadata.pending_person_name = draft.billTo.name;
    metadata.pending_person_subtitle = draft.billTo.subtitle;
  }
  if (draft.payTo && !isBillingUuid(draft.payTo.id)) {
    metadata.pending_person_name = draft.payTo.name;
    metadata.pending_person_subtitle = draft.payTo.subtitle;
  }
  if (draft.work && !isBillingUuid(draft.work.id)) {
    metadata.pending_work_title = draft.work.title;
  }

  metadata.activity = [
    {
      id: "created",
      at: now,
      kind: "user",
      label: "Draft added to Billing Memory",
      detail: "Salt prepared this record from Ask Salt or an uploaded document.",
    },
  ];

  return {
    workspace_id: workspaceId,
    direction: draft.direction,
    number: draft.number,
    status: draft.status,
    amount_cents: draft.amountCents,
    amount_paid_cents: draft.status === "paid" ? draft.amountCents : 0,
    // billing_records.currency CHECK is uppercase ISO-4217 (20260703180000);
    // the draft schema already normalizes to uppercase.
    currency: draft.currency,
    issued_at: draft.issuedAt ?? now,
    due_at: draft.dueAt,
    paid_at: draft.paidAt ?? null,
    organization_id: draft.org && isBillingUuid(draft.org.id) ? draft.org.id : null,
    person_id:
      (draft.billTo && isBillingUuid(draft.billTo.id) ? draft.billTo.id : null) ??
      (draft.payTo && isBillingUuid(draft.payTo.id) ? draft.payTo.id : null),
    project_id: draft.work && isBillingUuid(draft.work.id) ? draft.work.id : null,
    vendor_label:
      draft.vendorLabel ??
      (draft.direction === "receivable" && draft.org && !isBillingUuid(draft.org.id)
        ? draft.org.name
        : null),
    category: draft.category ?? null,
    provider: "manual" as const,
    source: "user" as const,
    origin: "added" as const,
    line_items: draft.lineItems,
    tags: draft.tags,
    worth_attention:
      draft.status === "paid"
        ? null
        : draft.worthAttention ??
          ({
            reason: "Draft record is ready for review.",
            suggestedPlay:
              draft.direction === "receivable"
                ? "Review and send invoice"
                : "Review payable details",
          } satisfies BillingWorthAttentionRow),
    extraction: draft.extraction ?? null,
    source_external_id: buildManualBillingSourceExternalId({
      direction: draft.direction,
      number: draft.number,
    }),
    metadata,
    created_by: userId,
  };
}
