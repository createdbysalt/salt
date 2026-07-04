import { createClient } from "@/app/_lib/supabase/server";
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
      .select("id, name, title, record_status, relationship_type")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(GRAPH_ENTITY_LIMIT),
    supabase
      .from("organizations")
      .select("id, name, industry, record_status, relationship_status")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(GRAPH_ENTITY_LIMIT),
    supabase
      .from("work")
      .select("id, name, status, organization_id, person_id")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(GRAPH_ENTITY_LIMIT),
    supabase
      .from("notes")
      .select("id, title, content")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(GRAPH_NOTE_LIMIT),
    supabase
      .from("billing_records")
      .select(
        "id, number, amount_cents, currency, status, direction, organization_id, person_id, project_id"
      )
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(GRAPH_BILLING_LIMIT),
    supabase
      .from("files")
      .select("id, file_name, person_id, organization_id")
      .order("created_at", { ascending: false })
      .limit(GRAPH_FILE_LIMIT),
    supabase
      .from("meetings")
      .select("id, title, start_time, status, project_id, person_id, organization_id")
      .eq("workspace_id", workspaceId)
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

  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  const seenEdge = new Set<string>();

  const addEdge = (a: string, b: string, edgeType?: GraphEdge["edgeType"]) => {
    if (a === b) return;
    if (!nodes.has(a) || !nodes.has(b)) return;
    const key = a < b ? `${a}|${b}` : `${b}|${a}`;
    if (seenEdge.has(key)) return;
    seenEdge.add(key);
    edges.push({ source: a, target: b, edgeType });
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
    });
  }

  for (const w of work) {
    nodes.set(nid("work", w.id), {
      id: nid("work", w.id),
      type: "work",
      label: w.name,
      sublabel: w.status ?? undefined,
      href: `/work/${w.id}`,
    });
  }

  for (const b of billing) {
    const label = b.number || `${b.direction === "receivable" ? "INV" : "BILL"}-${b.id.slice(0, 6)}`;
    const amount = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: b.currency.toUpperCase(),
    }).format(b.amount_cents / 100);
    nodes.set(nid("billing", b.id), {
      id: nid("billing", b.id),
      type: "billing",
      label,
      sublabel: `${amount} · ${b.status}`,
      href: `/billing/${b.id}`,
    });
  }

  const personIdSet = new Set(people.map((p) => p.id));

  // File → work linkage lives in entity_links (files.project_id dropped in 6.4)
  const workLinkedFileIds = new Set(
    entityLinks
      .filter(
        (link) =>
          link.source_type === "file" &&
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
    nodes.set(nid("file", f.id), {
      id: nid("file", f.id),
      type: "file",
      label: f.file_name,
      sublabel: "File",
      href: `/files?preview=${f.id}`,
    });
  }

  for (const m of meetings) {
    const linked =
      (m.project_id && workIdSet.has(m.project_id)) ||
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

    nodes.set(nid("note", n.id), {
      id: nid("note", n.id),
      type: "note",
      label: title,
      sublabel: "Note",
      href: "/me",
    });
  }

  // Person ↔ Org edges (employment, structured: organization_people)
  for (const link of orgLinks) {
    addEdge(nid("person", link.person_id), nid("org", link.organization_id), "employment");
  }

  // Explicit edges (manual/keeper links + note mentions) from entity_links
  for (const link of entityLinks) {
    addEdge(
      nid(link.source_type as NodeType, link.source_id),
      nid(link.target_type as NodeType, link.target_id),
      (link.relation_type as GraphEdge["edgeType"]) ?? "related"
    );
  }

  // Work edges (structured: projects.organization_id / person_id)
  for (const w of work) {
    if (w.organization_id && orgIdSet.has(w.organization_id)) {
      addEdge(nid("work", w.id), nid("org", w.organization_id), "structural");
    }
    if (w.person_id && personIdSet.has(w.person_id)) {
      addEdge(nid("work", w.id), nid("person", w.person_id), "structural");
    }
  }

  // Billing edges (payment, structured FKs)
  for (const b of billing) {
    if (b.organization_id && orgIdSet.has(b.organization_id)) {
      addEdge(nid("billing", b.id), nid("org", b.organization_id), "payment");
    }
    if (b.person_id) {
      addEdge(nid("billing", b.id), nid("person", b.person_id), "payment");
    }
    if (b.project_id && workIdSet.has(b.project_id)) {
      addEdge(nid("billing", b.id), nid("work", b.project_id), "payment");
    }
  }

  // File edges (attachment via person/org FKs; file→work edges arrive via entity_links)
  for (const f of files) {
    if (f.person_id && personIdSet.has(f.person_id)) {
      addEdge(nid("file", f.id), nid("person", f.person_id), "attachment");
    }
    if (f.organization_id && orgIdSet.has(f.organization_id)) {
      addEdge(nid("file", f.id), nid("org", f.organization_id), "attachment");
    }
  }

  // Meeting edges (structured FKs)
  for (const m of meetings) {
    if (m.project_id && workIdSet.has(m.project_id)) {
      addEdge(nid("meeting", m.id), nid("work", m.project_id), "structural");
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

  // For work items, fetch the primary org via organization_id
  let workPrimaryOrg: { id: string; name: string; industry?: string } | null = null;
  if (entityType === "work") {
    const { data: project } = await supabase
      .from("work")
      .select("organization_id")
      .eq("id", entityId)
      .maybeSingle();

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
        .maybeSingle();

      if (orgRow) {
        personPrimaryOrg = { id: orgRow.id, name: orgRow.name, industry: orgRow.industry ?? undefined };
      }
    }
  }

  const [relationsResult, billingResult, filesResult, meetingsResult] =
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
              "id, number, amount_cents, currency, status, direction, organization_id, person_id, project_id"
            )
            .eq("workspace_id", workspaceId)
            .eq("person_id", entityId)
        : entityType === "org"
          ? supabase
              .from("billing_records")
              .select(
                "id, number, amount_cents, currency, status, direction, organization_id, person_id, project_id"
              )
              .eq("workspace_id", workspaceId)
              .eq("organization_id", entityId)
          : supabase
              .from("billing_records")
              .select(
                "id, number, amount_cents, currency, status, direction, organization_id, person_id, project_id"
              )
              .eq("workspace_id", workspaceId)
              .eq("project_id", entityId),

      // Files (only for work entities currently; linkage lives in entity_links)
      entityType === "work"
        ? supabase
            .from("entity_links")
            .select("source_id")
            .eq("workspace_id", workspaceId)
            .eq("source_type", "file")
            .eq("target_type", "work")
            .eq("target_id", entityId)
        : Promise.resolve({ data: [], error: null }),

      // Meetings linked via structured FKs (project_id / person_id / organization_id)
      entityType === "work"
        ? supabase
            .from("meetings")
            .select("id, title, start_time, status")
            .eq("project_id", entityId)
        : entityType === "person"
          ? supabase
              .from("meetings")
              .select("id, title, start_time, status")
              .eq("person_id", entityId)
          : entityType === "org"
            ? supabase
                .from("meetings")
                .select("id, title, start_time, status")
                .eq("organization_id", entityId)
            : Promise.resolve({ data: [], error: null }),
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
  const billingIds = relatedEntityIds
    .filter((e) => e.type === "billing")
    .map((e) => e.id);
  const meetingIds = relatedEntityIds
    .filter((e) => e.type === "meeting")
    .map((e) => e.id);

  const [peopleData, orgsData, workData, billingData, meetingData] = await Promise.all([
    personIds.length > 0
      ? supabase.from("people").select("id, name, title").in("id", personIds)
      : Promise.resolve({ data: [] }),
    orgIds.length > 0
      ? supabase
          .from("organizations")
          .select("id, name, industry")
          .in("id", orgIds)
      : Promise.resolve({ data: [] }),
    workIds.length > 0
      ? supabase.from("work").select("id, name, status").in("id", workIds)
      : Promise.resolve({ data: [] }),
    billingIds.length > 0
      ? supabase
          .from("billing_records")
          .select("id, number, amount_cents, currency, status, direction")
          .in("id", billingIds)
      : Promise.resolve({ data: [] }),
    meetingIds.length > 0
      ? supabase
          .from("meetings")
          .select("id, title, start_time, status")
          .in("id", meetingIds)
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

  // Process files (resolve linked file ids from entity_links, then hydrate rows)
  const linkedFileIds = [
    ...new Set((filesResult.data ?? []).map((link) => link.source_id)),
  ];
  if (linkedFileIds.length > 0) {
    const { data: fileRows } = await supabase
      .from("files")
      .select("id, file_name, mime_type, size_bytes")
      .in("id", linkedFileIds);

    for (const f of fileRows ?? []) {
      addConnection({
        id: nid("file", f.id),
        nodeType: "file",
        label: f.file_name,
        sublabel: f.mime_type ?? "File",
        href: `/files?preview=${f.id}`,
        metadata: {
          type: "file",
          fileName: f.file_name,
          mimeType: f.mime_type ?? undefined,
          sizeBytes: f.size_bytes ?? undefined,
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
      .select("id, title, content")
      .eq("workspace_id", workspaceId)
      .in("id", backlinkNoteIds)
      .is("deleted_at", null);

    for (const n of backlinkNotes ?? []) {
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
      ? supabase.from("people").select("id, name, title").in("id", hop2PersonIds)
      : Promise.resolve({ data: [] }),
    hop2OrgIds.length > 0
      ? supabase.from("organizations").select("id, name, industry").in("id", hop2OrgIds)
      : Promise.resolve({ data: [] }),
    hop2WorkIds.length > 0
      ? supabase.from("work").select("id, name, status").in("id", hop2WorkIds)
      : Promise.resolve({ data: [] }),
    hop2BillingIds.length > 0
      ? supabase
          .from("billing_records")
          .select("id, number, amount_cents, currency, status, direction")
          .in("id", hop2BillingIds)
      : Promise.resolve({ data: [] }),
    hop2MeetingIds.length > 0
      ? supabase
          .from("meetings")
          .select("id, title, start_time, status")
          .in("id", hop2MeetingIds)
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
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}
