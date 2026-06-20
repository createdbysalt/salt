import { createClient } from "@/app/_lib/supabase/server";
import { extractWikilinks } from "@/app/_lib/notes";
import type { NodeType, GraphNode, GraphEdge, ConnectionsGraph } from "@/app/_lib/demo/connections-graph-data";

const nid = (type: NodeType, id: string) => `${type}:${id}`;

type EntityLookup = Map<string, { kind: "person" | "org" | "work"; id: string }>;

export async function getConnectionsGraphData(workspaceId: string): Promise<ConnectionsGraph> {
  const supabase = await createClient();

  // Fetch all entity types in parallel
  const [peopleResult, orgsResult, workResult, notesResult] = await Promise.all([
    supabase
      .from("people")
      .select("id, name, role, org_id")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null),
    supabase
      .from("organizations")
      .select("id, name, industry")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null),
    supabase
      .from("work")
      .select("id, title, status, person_id, organization_id")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null),
    supabase
      .from("notes")
      .select("id, title, content")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null),
  ]);

  const people = peopleResult.data ?? [];
  const orgs = orgsResult.data ?? [];
  const work = workResult.data ?? [];
  const notes = notesResult.data ?? [];

  // Build entity lookup for wikilink resolution
  const entityLookup: EntityLookup = new Map();
  for (const p of people) {
    entityLookup.set(p.name.toLowerCase(), { kind: "person", id: p.id });
  }
  for (const o of orgs) {
    entityLookup.set(o.name.toLowerCase(), { kind: "org", id: o.id });
  }
  for (const w of work) {
    entityLookup.set(w.title.toLowerCase(), { kind: "work", id: w.id });
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

  // Add person nodes
  for (const p of people) {
    nodes.set(nid("person", p.id), {
      id: nid("person", p.id),
      type: "person",
      label: p.name,
      sublabel: p.role ?? undefined,
      href: `/people/${p.id}`,
    });
  }

  // Add org nodes
  for (const o of orgs) {
    nodes.set(nid("org", o.id), {
      id: nid("org", o.id),
      type: "org",
      label: o.name,
      sublabel: o.industry ?? undefined,
      href: `/orgs/${o.id}`,
    });
  }

  // Add work nodes
  for (const w of work) {
    nodes.set(nid("work", w.id), {
      id: nid("work", w.id),
      type: "work",
      label: w.title,
      sublabel: w.status ?? undefined,
      href: `/work/${w.id}`,
    });
  }

  // Add note nodes (only if they have wikilinks that resolve)
  const noteRecords: Array<{
    id: string;
    title: string;
    linkedEntities: Array<{ kind: "person" | "org" | "work"; id: string }>;
  }> = [];

  for (const n of notes) {
    const wikilinks = extractWikilinks(n.content);
    if (wikilinks.length === 0) continue;

    const linkedEntities: Array<{ kind: "person" | "org" | "work"; id: string }> = [];
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

  // Add edges: person -> org
  for (const p of people) {
    if (p.org_id) {
      addEdge(nid("person", p.id), nid("org", p.org_id));
    }
  }

  // Add edges: work -> person, work -> org
  for (const w of work) {
    if (w.person_id) {
      addEdge(nid("work", w.id), nid("person", w.person_id));
    }
    if (w.organization_id) {
      addEdge(nid("work", w.id), nid("org", w.organization_id));
    }
  }

  // Add edges: note -> entities
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
