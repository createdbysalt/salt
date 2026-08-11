import { createClient } from "@/app/_lib/supabase/server";
import { fromDbEntityType } from "@/app/_features/memory/types/entity-type";
import {
  type NodeType,
  type ConnectionNode,
  type LegacyConnectionsGraph,
  type GraphNode,
  type GraphEdge,
  nodeId as nid,
} from "./types";

const GRAPH_ENTITY_LIMIT = 200;
const GRAPH_NOTE_LIMIT = 150;
const GRAPH_BILLING_LIMIT = 100;
const GRAPH_FILE_LIMIT = 100;
const GRAPH_MEETING_LIMIT = 100;

/** DB short-dialect `file` maps to graph node type `resource` (product noun). */
function toGraphNodeType(dbType: string): NodeType {
  if (dbType === "file") return "resource";
  return dbType as NodeType;
}

export async function getConnectionsGraphData(
  workspaceId: string
): Promise<LegacyConnectionsGraph> {
  const supabase = await createClient();

  const [
    peopleResult,
    orgsResult,
    workResult,
    notesResult,
    billingResult,
    filesResult,
    meetingsResult,
  ] = await Promise.all([
    supabase
      .from("people")
      .select("id, name, title, record_status, relationship_type, ai_summary, ai_worth_attention")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(GRAPH_ENTITY_LIMIT),
    supabase
      .from("organizations")
      .select("id, name, industry, record_status, relationship_status, ai_summary, ai_worth_attention")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(GRAPH_ENTITY_LIMIT),
    supabase
      .from("work")
      .select("id, name, status, organization_id, person_id, billing_contact_id, ai_summary, ai_worth_attention")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(GRAPH_ENTITY_LIMIT),
    supabase
      .from("notes")
      .select("id, title, content")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .eq("is_archived", false)
      .order("updated_at", { ascending: false })
      .limit(GRAPH_NOTE_LIMIT),
    supabase
      .from("billing_records")
      .select(
        "id, number, amount_cents, currency, status, direction, organization_id, person_id, work_id"
      )
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .is("archived_at", null)
      .order("created_at", { ascending: false })
      .limit(GRAPH_BILLING_LIMIT),
    supabase
      .from("resources")
      .select("id, file_name, person_id, organization_id, ai_summary, resource_type")
      .is("deleted_at", null)
      .is("archived_at", null)
      .order("created_at", { ascending: false })
      .limit(GRAPH_FILE_LIMIT),
    supabase
      .from("meetings")
      .select("id, title, start_time, status, work_id, person_id, organization_id")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .is("archived_at", null)
      .order("start_time", { ascending: false })
      .limit(GRAPH_MEETING_LIMIT),
  ]);

  const people = peopleResult.data ?? [];
  const orgs = orgsResult.data ?? [];
  const work = workResult.data ?? [];
  const notes = notesResult.data ?? [];
  const billing = billingResult.data ?? [];
  const files = filesResult.data ?? [];
  const meetings = meetingsResult.data ?? [];

  const personIds = people.map((p) => p.id);
  const orgIdSet = new Set(orgs.map((o) => o.id));
  const workIdSet = new Set(work.map((w) => w.id));

  let orgLinks: Array<{ person_id: string; organization_id: string }> = [];
  if (personIds.length > 0) {
    const { data } = await supabase
      .from("organization_people")
      .select("person_id, organization_id")
      .in("person_id", personIds);

    orgLinks = (data ?? []).filter((link) =>
      orgIdSet.has(link.organization_id)
    );
  }

  let entityLinks: Array<{
    source_type: string;
    source_id: string;
    target_type: string;
    target_id: string;
    relation_type: string;
  }> = [];
  const { data: linksData } = await supabase
    .from("entity_links")
    .select("source_type, source_id, target_type, target_id, relation_type")
    .eq("workspace_id", workspaceId);
  entityLinks = linksData ?? [];

  // Projected-edge provenance: FK-projected edges below inherit the
  // because/confidence of the field write that set the FK, so the graph can
  // say why two records connect. Latest applied write per field wins.
  const { data: provenanceRows } = await supabase
    .from("profile_field_provenance")
    .select("entity_type, entity_id, field, confidence, because, set_at")
    .eq("workspace_id", workspaceId)
    .eq("status", "applied")
    .in("entity_type", ["work", "billing"])
    .in("field", ["billing_contact_id", "organization_id", "person_id", "work_id"])
    .order("set_at", { ascending: false })
    .limit(500);

  const edgeProvenance = new Map<
    string,
    { because?: string; confidence?: number }
  >();
  for (const row of provenanceRows ?? []) {
    const key = `${row.entity_type}:${row.entity_id}:${row.field}`;
    if (edgeProvenance.has(key)) continue;
    edgeProvenance.set(key, {
      because: row.because ?? undefined,
      confidence: row.confidence ?? undefined,
    });
  }

  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  const seenEdge = new Set<string>();

  const addEdge = (
    a: string,
    b: string,
    edgeType?: GraphEdge["edgeType"],
    provenance?: { because?: string; confidence?: number }
  ) => {
    if (a === b) return;
    if (!nodes.has(a) || !nodes.has(b)) return;
    const key = a < b ? `${a}|${b}` : `${b}|${a}`;
    if (seenEdge.has(key)) return;
    seenEdge.add(key);
    edges.push({ source: a, target: b, edgeType, ...provenance });
  };

  for (const p of people) {
    nodes.set(nid("person", p.id), {
      id: nid("person", p.id),
      type: "person",
      label: p.name,
      sublabel: p.title ?? undefined,
      href: `/people/${p.id}`,
      recordStatus: p.record_status === "inactive" ? "inactive" : "active",
      relationship: p.relationship_type ?? undefined,
      summary: p.ai_summary ?? undefined,
      worthAttention: p.ai_worth_attention ?? undefined,
    });
  }

  for (const o of orgs) {
    nodes.set(nid("org", o.id), {
      id: nid("org", o.id),
      type: "org",
      label: o.name,
      sublabel: o.industry ?? undefined,
      href: `/orgs/${o.id}`,
      recordStatus: o.record_status === "inactive" ? "inactive" : "active",
      relationship: o.relationship_status ?? undefined,
      summary: o.ai_summary ?? undefined,
      worthAttention: o.ai_worth_attention ?? undefined,
    });
  }

  for (const w of work) {
    nodes.set(nid("work", w.id), {
      id: nid("work", w.id),
      type: "work",
      label: w.name,
      sublabel: w.status ?? undefined,
      href: `/work/${w.id}`,
      summary: w.ai_summary ?? undefined,
      worthAttention: w.ai_worth_attention ?? undefined,
    });
  }

  for (const b of billing) {
    const label = b.number || `${b.direction === "receivable" ? "INV" : "BILL"}-${b.id.slice(0, 6)}`;
    const amount = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: b.currency.toUpperCase(),
    }).format(b.amount_cents / 100);
    const isReceivable = b.direction === "receivable";
    const worthAttention =
      b.status === "overdue"
        ? isReceivable
          ? "overdue — worth chasing"
          : "overdue — pay this soon"
        : b.status === "disputed"
          ? "disputed — needs a response"
          : b.status === "partial"
            ? "partially paid — balance still outstanding"
            : b.status === "draft"
              ? "a draft — not sent yet"
              : isReceivable && b.status === "due"
                ? "still unpaid"
                : undefined;
    nodes.set(nid("billing", b.id), {
      id: nid("billing", b.id),
      type: "billing",
      label,
      sublabel: `${amount} · ${b.status}`,
      href: `/billing/${b.id}`,
      summary: isReceivable ? "Money owed to you." : "Money you owe.",
      worthAttention,
    });
  }

  const personIdSet = new Set(people.map((p) => p.id));

  // Resource → work linkage lives in entity_links (files.project_id dropped in 6.4)
  const workLinkedFileIds = new Set(
    entityLinks
      .filter(
        (link) =>
          fromDbEntityType(link.source_type) === "resource" &&
          link.target_type === "work" &&
          workIdSet.has(link.target_id)
      )
      .map((link) => link.source_id)
  );

  for (const f of files) {
    const linked =
      workLinkedFileIds.has(f.id) ||
      (f.person_id && personIdSet.has(f.person_id)) ||
      (f.organization_id && orgIdSet.has(f.organization_id));
    if (!linked) continue;
    nodes.set(nid("resource", f.id), {
      id: nid("resource", f.id),
      type: "resource",
      label: f.file_name,
      sublabel: f.resource_type && f.resource_type !== "file" ? "Resource" : "File",
      href: `/resources?preview=${f.id}`,
      summary: f.ai_summary ?? undefined,
    });
  }

  // AI summary per meeting (same source as the meeting overview page).
  // Rows arrive newest-first: prefer the row flagged is_current, else the
  // most recent generation.
  const meetingSummaryById = new Map<string, string>();
  const meetingIds = meetings.map((m) => m.id);
  if (meetingIds.length > 0) {
    const { data: summaryRows } = await supabase
      .from("meeting_summaries")
      .select("meeting_id, content, is_current, created_at")
      .in("meeting_id", meetingIds)
      .order("created_at", { ascending: false });
    const currentByMeeting = new Map<string, string>();
    const latestByMeeting = new Map<string, string>();
    for (const row of summaryRows ?? []) {
      if (!row.meeting_id || !row.content) continue;
      if (!latestByMeeting.has(row.meeting_id)) {
        latestByMeeting.set(row.meeting_id, row.content);
      }
      if (row.is_current && !currentByMeeting.has(row.meeting_id)) {
        currentByMeeting.set(row.meeting_id, row.content);
      }
    }
    for (const id of meetingIds) {
      const content = currentByMeeting.get(id) ?? latestByMeeting.get(id);
      if (content) meetingSummaryById.set(id, content);
    }
  }

  for (const m of meetings) {
    const linked =
      (m.work_id && workIdSet.has(m.work_id)) ||
      (m.person_id && personIdSet.has(m.person_id)) ||
      (m.organization_id && orgIdSet.has(m.organization_id));
    if (!linked) continue;
    nodes.set(nid("meeting", m.id), {
      id: nid("meeting", m.id),
      type: "meeting",
      label: m.title,
      sublabel: m.start_time
        ? new Date(m.start_time).toLocaleDateString()
        : "Meeting",
      href: `/meetings/${m.id}`,
      summary: meetingSummaryById.get(m.id),
    });
  }

  // Note nodes: notes that mention other entities (mention edges live in entity_links)
  const mentioningNoteIds = new Set(
    entityLinks
      .filter((link) => link.source_type === "note" && link.relation_type === "mention")
      .map((link) => link.source_id)
  );

  for (const n of notes) {
    if (!mentioningNoteIds.has(n.id)) continue;

    const title =
      n.title || n.content.slice(0, 40) + (n.content.length > 40 ? "…" : "");

    const excerpt = n.content.trim().slice(0, 140);

    nodes.set(nid("note", n.id), {
      id: nid("note", n.id),
      type: "note",
      label: title,
      sublabel: "Note",
      href: "/me",
      summary: excerpt
        ? excerpt + (n.content.trim().length > 140 ? "…" : "")
        : undefined,
    });
  }

  // Person ↔ Org edges (employment, structured: organization_people)
  for (const link of orgLinks) {
    addEdge(nid("person", link.person_id), nid("org", link.organization_id), "employment");
  }

  // Explicit edges (manual/care links + note mentions) from entity_links
  for (const link of entityLinks) {
    addEdge(
      nid(toGraphNodeType(link.source_type), link.source_id),
      nid(toGraphNodeType(link.target_type), link.target_id),
      (link.relation_type as GraphEdge["edgeType"]) ?? "related"
    );
  }

  // Work edges (structured: projects.organization_id / person_id / billing_contact_id)
  for (const w of work) {
    if (w.organization_id && orgIdSet.has(w.organization_id)) {
      addEdge(nid("work", w.id), nid("org", w.organization_id), "structural");
    }
    if (w.person_id && personIdSet.has(w.person_id)) {
      addEdge(nid("work", w.id), nid("person", w.person_id), "structural");
    }
    if (w.billing_contact_id && personIdSet.has(w.billing_contact_id)) {
      addEdge(
        nid("work", w.id),
        nid("person", w.billing_contact_id),
        "structural",
        edgeProvenance.get(`work:${w.id}:billing_contact_id`)
      );
    }
  }

  // Billing edges (payment, structured FKs)
  for (const b of billing) {
    if (b.organization_id && orgIdSet.has(b.organization_id)) {
      addEdge(
        nid("billing", b.id),
        nid("org", b.organization_id),
        "payment",
        edgeProvenance.get(`billing:${b.id}:organization_id`)
      );
    }
    if (b.person_id) {
      addEdge(
        nid("billing", b.id),
        nid("person", b.person_id),
        "payment",
        edgeProvenance.get(`billing:${b.id}:person_id`)
      );
    }
    if (b.work_id && workIdSet.has(b.work_id)) {
      addEdge(
        nid("billing", b.id),
        nid("work", b.work_id),
        "payment",
        edgeProvenance.get(`billing:${b.id}:work_id`)
      );
    }
  }

  // Resource edges (attachment via person/org FKs; resource→work edges arrive via entity_links)
  for (const f of files) {
    if (f.person_id && personIdSet.has(f.person_id)) {
      addEdge(nid("resource", f.id), nid("person", f.person_id), "attachment");
    }
    if (f.organization_id && orgIdSet.has(f.organization_id)) {
      addEdge(nid("resource", f.id), nid("org", f.organization_id), "attachment");
    }
  }

  // Meeting edges (structured FKs)
  for (const m of meetings) {
    if (m.work_id && workIdSet.has(m.work_id)) {
      addEdge(nid("meeting", m.id), nid("work", m.work_id), "structural");
    }
    if (m.person_id && personIdSet.has(m.person_id)) {
      addEdge(nid("meeting", m.id), nid("person", m.person_id), "structural");
    }
    if (m.organization_id && orgIdSet.has(m.organization_id)) {
      addEdge(nid("meeting", m.id), nid("org", m.organization_id), "structural");
    }
  }

  return { nodes: Array.from(nodes.values()), edges };
}

export type EntityType = "person" | "org" | "work" | "billing" | "meeting";

type RelatedEntity = {
  type: EntityType;
  id: string;
  viaLabel?: string;
};

/**
 * Get all connections for a specific entity.
 * Used by detail pages to show unified Connections tab.
 */
export async function getEntityConnections(
  workspaceId: string,
  entityType: EntityType,
  entityId: string
): Promise<ConnectionNode[]> {
  const supabase = await createClient();

  // For work items, fetch the primary org via organization_id and the
  // billing contact via billing_contact_id (reference-field projection)
  let workPrimaryOrg: { id: string; name: string; industry?: string } | null = null;
  let workBillingContactId: string | null = null;
  if (entityType === "work") {
    const { data: project } = await supabase
      .from("work")
      .select("organization_id, billing_contact_id")
      .eq("id", entityId)
      .maybeSingle();

    workBillingContactId = project?.billing_contact_id ?? null;

    if (project?.organization_id) {
      const { data: orgRow } = await supabase
        .from("organizations")
        .select("id, name, industry")
        .eq("workspace_id", workspaceId)
        .eq("id", project.organization_id)
        .is("deleted_at", null)
        .maybeSingle();

      if (orgRow) {
        workPrimaryOrg = { id: orgRow.id, name: orgRow.name, industry: orgRow.industry ?? undefined };
      }
    }
  }

  // For person, fetch primary org via organization_people
  let personPrimaryOrg: { id: string; name: string; industry?: string } | null = null;
  if (entityType === "person") {
    const { data: orgLinks } = await supabase
      .from("organization_people")
      .select("organization_id, is_primary")
      .eq("person_id", entityId)
      .order("is_primary", { ascending: false })
      .limit(1);

    if (orgLinks?.[0]?.organization_id) {
      const { data: orgRow } = await supabase
        .from("organizations")
        .select("id, name, industry")
        .eq("id", orgLinks[0].organization_id)
        .is("deleted_at", null)
        .is("archived_at", null)
        .maybeSingle();

      if (orgRow) {
        personPrimaryOrg = { id: orgRow.id, name: orgRow.name, industry: orgRow.industry ?? undefined };
      }
    }
  }

  const [
    relationsResult,
    billingResult,
    filesResult,
    meetingsResult,
    billingContactWorkResult,
    orgPeopleResult,
    billingSelfResult,
  ] =
    await Promise.all([
      // Entity links (explicit connections to people, orgs, work + note mentions)
      supabase
        .from("entity_links")
        .select("source_type, source_id, target_type, target_id, relation_type")
        .eq("workspace_id", workspaceId)
        .or(
          `and(source_type.eq.${entityType},source_id.eq.${entityId}),and(target_type.eq.${entityType},target_id.eq.${entityId})`
        ),

      // Billing records linked to this entity
      entityType === "person"
        ? supabase
            .from("billing_records")
            .select(
              "id, number, amount_cents, currency, status, direction, organization_id, person_id, work_id"
            )
            .eq("workspace_id", workspaceId)
            .eq("person_id", entityId)
            .is("deleted_at", null)
            .is("archived_at", null)
        : entityType === "org"
          ? supabase
              .from("billing_records")
              .select(
                "id, number, amount_cents, currency, status, direction, organization_id, person_id, work_id"
              )
              .eq("workspace_id", workspaceId)
              .eq("organization_id", entityId)
              .is("deleted_at", null)
              .is("archived_at", null)
          : entityType === "work"
            ? supabase
                .from("billing_records")
                .select(
                  "id, number, amount_cents, currency, status, direction, organization_id, person_id, work_id"
                )
                .eq("workspace_id", workspaceId)
                .eq("work_id", entityId)
                .is("deleted_at", null)
                .is("archived_at", null)
            : Promise.resolve({ data: [], error: null }),

      // Files and Resources (linkage lives in entity_links; applies to all entity types)
      supabase
        .from("entity_links")
        .select("source_id")
        .eq("workspace_id", workspaceId)
        // Dual-read: legacy rows may still carry the pre-rename "file" spelling
        .in("source_type", ["resource", "file"])
        .eq("target_type", entityType)
        .eq("target_id", entityId),

      // Meetings linked via structured FKs (work_id / person_id / organization_id)
      entityType === "work"
        ? supabase
            .from("meetings")
            .select("id, title, start_time, status")
            .eq("work_id", entityId)
            .is("deleted_at", null)
            .is("archived_at", null)
        : entityType === "person"
          ? supabase
              .from("meetings")
              .select("id, title, start_time, status")
              .eq("person_id", entityId)
              .is("deleted_at", null)
              .is("archived_at", null)
          : entityType === "org"
            ? supabase
                .from("meetings")
                .select("id, title, start_time, status")
                .eq("organization_id", entityId)
                .is("deleted_at", null)
                .is("archived_at", null)
            : Promise.resolve({ data: [], error: null }),

      // Work items this person is the billing contact for
      // (reference-field projection: work.billingContactId)
      entityType === "person"
        ? supabase
            .from("work")
            .select("id, name, status")
            .eq("billing_contact_id", entityId)
            .is("deleted_at", null)
        : Promise.resolve({ data: [], error: null }),

      // People linked to this org via the junction
      // (reference-field projection: org.primaryContact and teammates)
      entityType === "org"
        ? supabase
            .from("organization_people")
            .select("person_id")
            .eq("organization_id", entityId)
        : Promise.resolve({ data: [], error: null }),

      // The billing record's own counterparty FKs
      // (reference-field projections: organization / billingContact / linkedWork)
      entityType === "billing"
        ? supabase
            .from("billing_records")
            .select("organization_id, person_id, work_id")
            .eq("id", entityId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

  const connections: ConnectionNode[] = [];
  const seenIds = new Set<string>();

  const addConnection = (node: ConnectionNode) => {
    if (seenIds.has(node.id)) return;
    seenIds.add(node.id);
    connections.push(node);
  };

  // Add work's primary org (via client_id relationship)
  if (workPrimaryOrg) {
    addConnection({
      id: nid("org", workPrimaryOrg.id),
      nodeType: "org",
      label: workPrimaryOrg.name,
      sublabel: workPrimaryOrg.industry ?? "Client organization",
      href: `/orgs/${workPrimaryOrg.id}`,
      metadata: { type: "org", industry: workPrimaryOrg.industry },
    });
  }

  // Add person's primary org (via organization_people relationship)
  if (personPrimaryOrg) {
    addConnection({
      id: nid("org", personPrimaryOrg.id),
      nodeType: "org",
      label: personPrimaryOrg.name,
      sublabel: personPrimaryOrg.industry ?? "Primary organization",
      href: `/orgs/${personPrimaryOrg.id}`,
      metadata: { type: "org", industry: personPrimaryOrg.industry },
    });
  }

  // Process entity links - need to resolve the other side
  const relations = relationsResult.data ?? [];
  const relatedEntityIds: { type: EntityType; id: string }[] = [];

  for (const rel of relations) {
    const isSource =
      rel.source_type === entityType && rel.source_id === entityId;
    const otherType = isSource ? rel.target_type : rel.source_type;
    const otherId = isSource ? rel.target_id : rel.source_id;

    if (otherType === "person" || otherType === "org" || otherType === "work" || otherType === "billing" || otherType === "meeting") {
      relatedEntityIds.push({ type: otherType, id: otherId });
    }
  }

  // Fetch related entities in batches by type
  const personIds = relatedEntityIds
    .filter((e) => e.type === "person")
    .map((e) => e.id);
  const orgIds = relatedEntityIds
    .filter((e) => e.type === "org")
    .map((e) => e.id);
  const workIds = relatedEntityIds
    .filter((e) => e.type === "work")
    .map((e) => e.id);

  // Reference-field projections merge into the hydration lists so the
  // linked records render as connections on both records.
  if (workBillingContactId) personIds.push(workBillingContactId);
  for (const row of orgPeopleResult.data ?? []) {
    personIds.push(row.person_id);
  }
  const billingSelf = billingSelfResult.data;
  if (billingSelf?.organization_id) orgIds.push(billingSelf.organization_id);
  if (billingSelf?.person_id) personIds.push(billingSelf.person_id);
  if (billingSelf?.work_id) workIds.push(billingSelf.work_id);
  const billingIds = relatedEntityIds
    .filter((e) => e.type === "billing")
    .map((e) => e.id);
  const meetingIds = relatedEntityIds
    .filter((e) => e.type === "meeting")
    .map((e) => e.id);

  const [peopleData, orgsData, workData, billingData, meetingData] = await Promise.all([
    personIds.length > 0
      ? supabase.from("people").select("id, name, title").in("id", personIds).is("deleted_at", null)
      : Promise.resolve({ data: [] }),
    orgIds.length > 0
      ? supabase
          .from("organizations")
          .select("id, name, industry")
          .in("id", orgIds)
          .is("deleted_at", null)
          .is("archived_at", null)
      : Promise.resolve({ data: [] }),
    workIds.length > 0
      ? supabase.from("work").select("id, name, status").in("id", workIds).is("deleted_at", null)
      : Promise.resolve({ data: [] }),
    billingIds.length > 0
      ? supabase
          .from("billing_records")
          .select("id, number, amount_cents, currency, status, direction")
          .in("id", billingIds)
          .is("deleted_at", null)
          .is("archived_at", null)
      : Promise.resolve({ data: [] }),
    meetingIds.length > 0
      ? supabase
          .from("meetings")
          .select("id, title, start_time, status")
          .in("id", meetingIds)
          .is("deleted_at", null)
          .is("archived_at", null)
      : Promise.resolve({ data: [] }),
  ]);

  for (const p of peopleData.data ?? []) {
    addConnection({
      id: nid("person", p.id),
      nodeType: "person",
      label: p.name,
      sublabel: p.title ?? undefined,
      href: `/people/${p.id}`,
      metadata: { type: "person", title: p.title ?? undefined },
    });
  }

  for (const o of orgsData.data ?? []) {
    addConnection({
      id: nid("org", o.id),
      nodeType: "org",
      label: o.name,
      sublabel: o.industry ?? undefined,
      href: `/orgs/${o.id}`,
      metadata: { type: "org", industry: o.industry ?? undefined },
    });
  }

  for (const w of workData.data ?? []) {
    addConnection({
      id: nid("work", w.id),
      nodeType: "work",
      label: w.name,
      sublabel: w.status ?? undefined,
      href: `/work/${w.id}`,
      metadata: { type: "work", status: w.status ?? "unknown" },
    });
  }

  // Work items where this person is the billing contact
  // (reference-field projection: work.billingContactId)
  for (const w of billingContactWorkResult.data ?? []) {
    addConnection({
      id: nid("work", w.id),
      nodeType: "work",
      label: w.name,
      sublabel: w.status ?? undefined,
      href: `/work/${w.id}`,
      metadata: { type: "work", status: w.status ?? "unknown" },
    });
  }

  // Process billing records from entity_links
  for (const b of billingData.data ?? []) {
    const label =
      b.number ||
      `${b.direction === "receivable" ? "INV" : "BILL"}-${b.id.slice(0, 6)}`;
    const amount = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: b.currency.toUpperCase(),
    }).format(b.amount_cents / 100);

    addConnection({
      id: nid("billing", b.id),
      nodeType: "billing",
      label,
      sublabel: `${amount} · ${b.status}`,
      href: `/billing/${b.id}`,
      metadata: {
        type: "billing",
        amountCents: b.amount_cents,
        currency: b.currency,
        status: b.status,
        direction: b.direction,
      },
    });
  }

  // Process meetings from entity_links
  for (const m of meetingData.data ?? []) {
    const startDate = new Date(m.start_time);
    const dateLabel = startDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    addConnection({
      id: nid("meeting", m.id),
      nodeType: "meeting",
      label: m.title,
      sublabel: `${dateLabel} · ${m.status}`,
      href: `/meetings/${m.id}`,
      metadata: {
        type: "meeting",
        startTime: m.start_time,
        status: m.status,
      },
    });
  }

  // Process billing records from implicit FK links
  for (const b of billingResult.data ?? []) {
    const label =
      b.number ||
      `${b.direction === "receivable" ? "INV" : "BILL"}-${b.id.slice(0, 6)}`;
    const amount = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: b.currency.toUpperCase(),
    }).format(b.amount_cents / 100);

    addConnection({
      id: nid("billing", b.id),
      nodeType: "billing",
      label,
      sublabel: `${amount} · ${b.status}`,
      href: `/billing/${b.id}`,
      metadata: {
        type: "billing",
        amountCents: b.amount_cents,
        currency: b.currency,
        status: b.status,
        direction: b.direction,
      },
    });
  }

  // Process files and resources (resolve linked file ids from entity_links, then hydrate rows)
  const linkedFileIds = [
    ...new Set((filesResult.data ?? []).map((link) => link.source_id)),
  ];
  if (linkedFileIds.length > 0) {
    const { data: fileRows } = await supabase
      .from("resources")
      .select("id, file_name, file_type, mime_type, size_bytes, external_url, mode, resource_type, last_activity_at, last_activity_summary, ai_summary")
      .in("id", linkedFileIds)
      .is("deleted_at", null)
      .is("archived_at", null);

    for (const f of fileRows ?? []) {
      const isExternal =
        f.file_type === "link" && f.resource_type && f.resource_type !== "file";
      let hostSublabel: string | undefined;
      if (f.external_url) {
        try {
          hostSublabel = new URL(f.external_url).hostname.replace(/^www\./, "");
        } catch {
          hostSublabel = undefined;
        }
      }

      addConnection({
        id: nid("resource", f.id),
        nodeType: "resource",
        label: f.file_name,
        sublabel: isExternal
          ? (hostSublabel ?? "Resource")
          : (f.mime_type ?? "File"),
        href: `/resources?preview=${f.id}`,
        metadata: isExternal
          ? {
              type: "resource",
              resourceType: f.resource_type,
              resourceUrl: f.external_url ?? undefined,
              mode: (f.mode ?? "static") as "static" | "live",
              lastActivityAt: f.last_activity_at ?? undefined,
              lastActivitySummary: f.last_activity_summary ?? undefined,
              aiSummary: f.ai_summary ?? undefined,
            }
          : {
              type: "file",
              fileName: f.file_name,
              mimeType: f.mime_type ?? undefined,
              sizeBytes: f.size_bytes ?? undefined,
              aiSummary: f.ai_summary ?? undefined,
            },
      });
    }
  }

  // Process meetings
  for (const m of meetingsResult.data ?? []) {
    addConnection({
      id: nid("meeting", m.id),
      nodeType: "meeting",
      label: m.title,
      sublabel: `${new Date(m.start_time).toLocaleDateString()} · ${m.status}`,
      href: `/meetings/${m.id}`,
    });
  }

  // Process notes (backlinks: notes whose mention edges target this entity)
  const backlinkNoteIds = relations
    .filter(
      (rel) =>
        rel.source_type === "note" &&
        rel.relation_type === "mention" &&
        rel.target_type === entityType &&
        rel.target_id === entityId
    )
    .map((rel) => rel.source_id);

  if (backlinkNoteIds.length > 0) {
    const { data: backlinkNotes } = await supabase
      .from("notes")
      .select("id, title, content, entity_type, entity_id")
      .eq("workspace_id", workspaceId)
      .in("id", backlinkNoteIds)
      .is("deleted_at", null)
      .eq("is_archived", false);

    const scopedEntityType =
      entityType === "org" ? "organization" : entityType;

    for (const n of backlinkNotes ?? []) {
      // Primary entity notes belong on the Notes tab, not Connections.
      if (n.entity_type === scopedEntityType && n.entity_id === entityId) {
        continue;
      }

      const title =
        n.title ||
        n.content.slice(0, 40) + (n.content.length > 40 ? "…" : "");
      addConnection({
        id: nid("note", n.id),
        nodeType: "note",
        label: title,
        sublabel: "Note",
        href: "/me",
        metadata: {
          type: "note",
          excerpt: n.content.slice(0, 100),
        },
      });
    }
  }

  // ============================================================================
  // TRANSITIVE CONNECTIONS (2nd hop)
  // For each direct person/org/work connection, fetch THEIR connections
  // and add them as indirect connections with "via [Entity Name]" sublabel.
  // ============================================================================

  // Build a map of direct connections for quick lookup (compositeId -> {label, type, id})
  const directConnectionInfo = new Map<string, { label: string; type: EntityType; id: string }>();
  for (const conn of connections) {
    const nodeType = conn.nodeType as EntityType;
    if (["person", "org", "work"].includes(nodeType)) {
      const id = conn.id.split(":")[1];
      if (id) {
        directConnectionInfo.set(conn.id, { label: conn.label, type: nodeType, id });
      }
    }
  }

  // Collect 2nd hop entities
  const secondHopEntities: RelatedEntity[] = [];

  // Build batched query for all direct connections' relations in ONE query
  // Group direct connection IDs by their DB entity type for the query
  const directPersonIds = Array.from(directConnectionInfo.values())
    .filter((c) => c.type === "person")
    .map((c) => c.id);
  const directOrgIds = Array.from(directConnectionInfo.values())
    .filter((c) => c.type === "org")
    .map((c) => c.id);
  const directWorkIds = Array.from(directConnectionInfo.values())
    .filter((c) => c.type === "work")
    .map((c) => c.id);

  // Build OR conditions for batched query
  const orConditions: string[] = [];

  if (directPersonIds.length > 0) {
    orConditions.push(`and(source_type.eq.person,source_id.in.(${directPersonIds.join(",")}))`);
    orConditions.push(`and(target_type.eq.person,target_id.in.(${directPersonIds.join(",")}))`);
  }
  if (directOrgIds.length > 0) {
    orConditions.push(`and(source_type.eq.org,source_id.in.(${directOrgIds.join(",")}))`);
    orConditions.push(`and(target_type.eq.org,target_id.in.(${directOrgIds.join(",")}))`);
  }
  if (directWorkIds.length > 0) {
    orConditions.push(`and(source_type.eq.work,source_id.in.(${directWorkIds.join(",")}))`);
    orConditions.push(`and(target_type.eq.work,target_id.in.(${directWorkIds.join(",")}))`);
  }

  if (orConditions.length > 0) {
    const { data: hop2Relations } = await supabase
      .from("entity_links")
      .select("source_type, source_id, target_type, target_id")
      .eq("workspace_id", workspaceId)
      .or(orConditions.join(","));

    // Process 2nd hop links
    for (const rel of hop2Relations ?? []) {
      // Determine which side is the "direct connection" we came from
      // and which side is the "2nd hop" entity
      const fromKey = `${rel.source_type}:${rel.source_id}`;
      const toKey = `${rel.target_type}:${rel.target_id}`;

      const fromDirect = directConnectionInfo.get(fromKey);
      const toDirect = directConnectionInfo.get(toKey);

      // The "other" side is the 2nd hop entity
      if (fromDirect) {
        const otherType = rel.target_type;
        const otherId = rel.target_id;
        const compositeId = nid(otherType as NodeType, otherId);

        // Skip original entity and already-seen connections
        if (otherId !== entityId && !seenIds.has(compositeId)) {
          if (["person", "org", "work", "billing", "meeting"].includes(otherType)) {
            secondHopEntities.push({
              type: otherType as EntityType,
              id: otherId,
              viaLabel: fromDirect.label,
            });
          }
        }
      }

      if (toDirect) {
        const otherType = rel.source_type;
        const otherId = rel.source_id;
        const compositeId = nid(otherType as NodeType, otherId);

        // Skip original entity and already-seen connections
        if (otherId !== entityId && !seenIds.has(compositeId)) {
          if (["person", "org", "work", "billing", "meeting"].includes(otherType)) {
            secondHopEntities.push({
              type: otherType as EntityType,
              id: otherId,
              viaLabel: toDirect.label,
            });
          }
        }
      }
    }
  }

  // Dedupe 2nd hop entities (keep first viaLabel encountered)
  const secondHopMap = new Map<string, RelatedEntity>();
  for (const e of secondHopEntities) {
    const key = `${e.type}:${e.id}`;
    if (!secondHopMap.has(key)) {
      secondHopMap.set(key, e);
    }
  }

  // Fetch entity details for 2nd hop connections
  const hop2PersonIds = Array.from(secondHopMap.values())
    .filter((e) => e.type === "person")
    .map((e) => e.id);
  const hop2OrgIds = Array.from(secondHopMap.values())
    .filter((e) => e.type === "org")
    .map((e) => e.id);
  const hop2WorkIds = Array.from(secondHopMap.values())
    .filter((e) => e.type === "work")
    .map((e) => e.id);
  const hop2BillingIds = Array.from(secondHopMap.values())
    .filter((e) => e.type === "billing")
    .map((e) => e.id);
  const hop2MeetingIds = Array.from(secondHopMap.values())
    .filter((e) => e.type === "meeting")
    .map((e) => e.id);

  const [hop2People, hop2Orgs, hop2Work, hop2Billing, hop2Meetings] = await Promise.all([
    hop2PersonIds.length > 0
      ? supabase.from("people").select("id, name, title").in("id", hop2PersonIds).is("deleted_at", null)
      : Promise.resolve({ data: [] }),
    hop2OrgIds.length > 0
      ? supabase
          .from("organizations")
          .select("id, name, industry")
          .in("id", hop2OrgIds)
          .is("deleted_at", null)
          .is("archived_at", null)
      : Promise.resolve({ data: [] }),
    hop2WorkIds.length > 0
      ? supabase.from("work").select("id, name, status").in("id", hop2WorkIds).is("deleted_at", null)
      : Promise.resolve({ data: [] }),
    hop2BillingIds.length > 0
      ? supabase
          .from("billing_records")
          .select("id, number, amount_cents, currency, status, direction")
          .in("id", hop2BillingIds)
          .is("deleted_at", null)
          .is("archived_at", null)
      : Promise.resolve({ data: [] }),
    hop2MeetingIds.length > 0
      ? supabase
          .from("meetings")
          .select("id, title, start_time, status")
          .in("id", hop2MeetingIds)
          .is("deleted_at", null)
          .is("archived_at", null)
      : Promise.resolve({ data: [] }),
  ]);

  // Helper to get viaLabel for an entity
  const getViaLabel = (type: EntityType, id: string): string | undefined => {
    const key = `${type}:${id}`;
    return secondHopMap.get(key)?.viaLabel;
  };

  // Add 2nd hop people
  for (const p of hop2People.data ?? []) {
    const viaLabel = getViaLabel("person", p.id);
    addConnection({
      id: nid("person", p.id),
      nodeType: "person",
      label: p.name,
      sublabel: viaLabel ? `via ${viaLabel}` : p.title ?? undefined,
      href: `/people/${p.id}`,
      metadata: { type: "person", title: p.title ?? undefined },
    });
  }

  // Add 2nd hop orgs
  for (const o of hop2Orgs.data ?? []) {
    const viaLabel = getViaLabel("org", o.id);
    addConnection({
      id: nid("org", o.id),
      nodeType: "org",
      label: o.name,
      sublabel: viaLabel ? `via ${viaLabel}` : o.industry ?? undefined,
      href: `/orgs/${o.id}`,
      metadata: { type: "org", industry: o.industry ?? undefined },
    });
  }

  // Add 2nd hop work
  for (const w of hop2Work.data ?? []) {
    const viaLabel = getViaLabel("work", w.id);
    addConnection({
      id: nid("work", w.id),
      nodeType: "work",
      label: w.name,
      sublabel: viaLabel ? `via ${viaLabel}` : w.status ?? undefined,
      href: `/work/${w.id}`,
      metadata: { type: "work", status: w.status ?? "unknown" },
    });
  }

  // Add 2nd hop billing
  for (const b of hop2Billing.data ?? []) {
    const viaLabel = getViaLabel("billing", b.id);
    const label =
      b.number ||
      `${b.direction === "receivable" ? "INV" : "BILL"}-${b.id.slice(0, 6)}`;
    const amount = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: b.currency.toUpperCase(),
    }).format(b.amount_cents / 100);

    addConnection({
      id: nid("billing", b.id),
      nodeType: "billing",
      label,
      sublabel: viaLabel ? `via ${viaLabel}` : `${amount} · ${b.status}`,
      href: `/billing/${b.id}`,
      metadata: {
        type: "billing",
        amountCents: b.amount_cents,
        currency: b.currency,
        status: b.status,
        direction: b.direction,
      },
    });
  }

  // Add 2nd hop meetings
  for (const m of hop2Meetings.data ?? []) {
    const viaLabel = getViaLabel("meeting", m.id);
    const startDate = new Date(m.start_time);
    const dateLabel = startDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    addConnection({
      id: nid("meeting", m.id),
      nodeType: "meeting",
      label: m.title,
      sublabel: viaLabel ? `via ${viaLabel}` : `${dateLabel} · ${m.status}`,
      href: `/meetings/${m.id}`,
      metadata: {
        type: "meeting",
        startTime: m.start_time,
        status: m.status,
      },
    });
  }

  return connections;
}

export async function getNotesForWorkspace(workspaceId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("notes")
    .select("id, title, content, category, author_type, is_pinned, created_at, updated_at")
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
    .eq("is_archived", false)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}
