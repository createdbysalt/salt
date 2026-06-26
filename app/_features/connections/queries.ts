import { createClient } from "@/app/_lib/supabase/server";
import { extractWikilinks } from "@/app/_lib/notes";
import type { NodeType, GraphNode, GraphEdge, ConnectionsGraph } from "@/app/_lib/demo/connections-graph-data";

const nid = (type: NodeType, id: string) => `${type}:${id}`;

type EntityLookup = Map<string, { kind: "person" | "org"; id: string }>;

const GRAPH_ENTITY_LIMIT = 200;
const GRAPH_NOTE_LIMIT = 150;

export async function getConnectionsGraphData(workspaceId: string): Promise<ConnectionsGraph> {
  const supabase = await createClient();

  const [peopleResult, orgsResult, notesResult] = await Promise.all([
    supabase
      .from("people")
      .select("id, name, title")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(GRAPH_ENTITY_LIMIT),
    supabase
      .from("organizations")
      .select("id, name, industry")
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
  ]);

  const people = peopleResult.data ?? [];
  const orgs = orgsResult.data ?? [];
  const notes = notesResult.data ?? [];

  const personIds = people.map((p) => p.id);
  const orgIdSet = new Set(orgs.map((o) => o.id));

  let orgLinks: Array<{ person_id: string; organization_id: string }> = [];
  if (personIds.length > 0) {
    const { data } = await supabase
      .from("organization_people")
      .select("person_id, organization_id")
      .in("person_id", personIds);

    orgLinks = (data ?? []).filter((link) => orgIdSet.has(link.organization_id));
  }

  const entityLookup: EntityLookup = new Map();
  for (const p of people) {
    entityLookup.set(p.name.toLowerCase(), { kind: "person", id: p.id });
  }
  for (const o of orgs) {
    entityLookup.set(o.name.toLowerCase(), { kind: "org", id: o.id });
  }

  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  const seenEdge = new Set<string>();

  const addEdge = (a: string, b: string) => {
    if (a === b) return;
    if (!nodes.has(a) || !nodes.has(b)) return;
    const key = a < b ? `${a}|${b}` : `${b}|${a}`;
    if (seenEdge.has(key)) return;
    seenEdge.add(key);
    edges.push({ source: a, target: b });
  };

  for (const p of people) {
    nodes.set(nid("person", p.id), {
      id: nid("person", p.id),
      type: "person",
      label: p.name,
      sublabel: p.title ?? undefined,
      href: `/people/${p.id}`,
    });
  }

  for (const o of orgs) {
    nodes.set(nid("org", o.id), {
      id: nid("org", o.id),
      type: "org",
      label: o.name,
      sublabel: o.industry ?? undefined,
      href: `/orgs/${o.id}`,
    });
  }

  const noteRecords: Array<{
    id: string;
    title: string;
    linkedEntities: Array<{ kind: "person" | "org"; id: string }>;
  }> = [];

  for (const n of notes) {
    const wikilinks = extractWikilinks(n.content);
    if (wikilinks.length === 0) continue;

    const linkedEntities: Array<{ kind: "person" | "org"; id: string }> = [];
    for (const link of wikilinks) {
      const entity = entityLookup.get(link.target.toLowerCase());
      if (entity) {
        linkedEntities.push(entity);
      }
    }

    if (linkedEntities.length > 0) {
      const title = n.title || n.content.slice(0, 40) + (n.content.length > 40 ? "…" : "");
      noteRecords.push({ id: n.id, title, linkedEntities });

      nodes.set(nid("note", n.id), {
        id: nid("note", n.id),
        type: "note",
        label: title,
        sublabel: "Note",
        href: "/me",
      });
    }
  }

  for (const link of orgLinks) {
    addEdge(nid("person", link.person_id), nid("org", link.organization_id));
  }

  for (const n of noteRecords) {
    for (const linked of n.linkedEntities) {
      addEdge(nid("note", n.id), nid(linked.kind, linked.id));
    }
  }

  return { nodes: Array.from(nodes.values()), edges };
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
