import { PEOPLE, type Invoice, type LinkedFile } from "./people-demo-data";
import { ORGS } from "./orgs-demo-data";
import { extractWikilinks } from "@/app/_lib/notes";

export type NodeType = "person" | "org" | "work" | "billing" | "file" | "note";

export type GraphNode = {
  id: string;
  type: NodeType;
  label: string;
  sublabel?: string;
  href?: string;
};

export type GraphEdge = { source: string; target: string };

const nid = (type: NodeType, id: string) => `${type}:${id}`;

export type ConnectionsGraph = {
  nodes: GraphNode[];
  edges: GraphEdge[];
};

type WorkDetail = { id: string; title: string; status: string };
type BillingRecord = {
  id: string;
  number: string;
  direction: "receivable" | "payable";
  org?: { id: string };
  billTo?: { id: string };
  payTo?: { id: string };
  work?: { id: string };
};
type MemoryFile = {
  id: string;
  name: string;
  provider: string;
  linkedTo: { kind: "person" | "org" | "work"; id: string };
};

type NoteRecord = {
  id: string;
  title: string;
  excerpt: string;
  linkedEntities: Array<{ kind: "person" | "org" | "work"; id: string }>;
};

function collectWorkDetails(): WorkDetail[] {
  const map = new Map<string, WorkDetail>();
  for (const p of PEOPLE) {
    for (const w of p.work) {
      map.set(w.id, { id: w.id, title: w.title, status: w.status });
    }
  }
  for (const o of ORGS) {
    for (const w of o.work) {
      map.set(w.id, { id: w.id, title: w.title, status: w.status });
    }
  }
  return Array.from(map.values());
}

function collectBillingRecords(): BillingRecord[] {
  const records: BillingRecord[] = [];
  const addInvoices = (
    invoices: Invoice[],
    orgId?: string,
    personId?: string,
    workId?: string,
  ) => {
    for (const inv of invoices) {
      records.push({
        id: inv.id,
        number: inv.number,
        direction: "receivable",
        org: orgId ? { id: orgId } : undefined,
        billTo: personId ? { id: personId } : undefined,
        work: workId ? { id: workId } : undefined,
      });
    }
  };
  for (const p of PEOPLE) {
    addInvoices(p.invoices, p.org?.id, p.id);
  }
  for (const o of ORGS) {
    addInvoices(o.invoices, o.id, o.keyContact?.id);
  }
  return records;
}

function collectMemoryFiles(): MemoryFile[] {
  const files: MemoryFile[] = [];
  const addFiles = (
    items: LinkedFile[],
    linkedTo: { kind: "person" | "org"; id: string },
  ) => {
    for (const f of items) {
      files.push({
        id: `${linkedTo.kind}-${linkedTo.id}-${f.id}`,
        name: f.name,
        provider: "Salt",
        linkedTo,
      });
    }
  };
  for (const p of PEOPLE) {
    addFiles(p.files, { kind: "person", id: p.id });
  }
  for (const o of ORGS) {
    addFiles(o.files, { kind: "org", id: o.id });
    for (const w of o.work) {
      for (const f of o.files) {
        files.push({
          id: `work-${w.id}-${f.id}`,
          name: f.name,
          provider: "Salt",
          linkedTo: { kind: "work", id: w.id },
        });
      }
    }
  }
  return files;
}

function collectNotes(): NoteRecord[] {
  const notes: NoteRecord[] = [];
  const entityLookup = new Map<string, { kind: "person" | "org" | "work"; id: string }>();

  for (const p of PEOPLE) {
    entityLookup.set(p.name.toLowerCase(), { kind: "person", id: p.id });
  }
  for (const o of ORGS) {
    entityLookup.set(o.name.toLowerCase(), { kind: "org", id: o.id });
  }
  const workDetails = collectWorkDetails();
  for (const w of workDetails) {
    entityLookup.set(w.title.toLowerCase(), { kind: "work", id: w.id });
  }

  for (const p of PEOPLE) {
    for (const note of p.notes) {
      const wikilinks = extractWikilinks(note.body);
      if (wikilinks.length === 0) continue;

      const linkedEntities: Array<{ kind: "person" | "org" | "work"; id: string }> = [];
      for (const link of wikilinks) {
        const entity = entityLookup.get(link.target.toLowerCase());
        if (entity) {
          linkedEntities.push(entity);
        }
      }

      if (linkedEntities.length > 0) {
        notes.push({
          id: `note-${p.id}-${note.id}`,
          title: note.body.slice(0, 40) + (note.body.length > 40 ? "…" : ""),
          excerpt: note.body.slice(0, 80),
          linkedEntities,
        });
      }
    }
  }

  for (const o of ORGS) {
    for (const note of o.notes) {
      const wikilinks = extractWikilinks(note.body);
      if (wikilinks.length === 0) continue;

      const linkedEntities: Array<{ kind: "person" | "org" | "work"; id: string }> = [];
      for (const link of wikilinks) {
        const entity = entityLookup.get(link.target.toLowerCase());
        if (entity) {
          linkedEntities.push(entity);
        }
      }

      if (linkedEntities.length > 0) {
        notes.push({
          id: `note-${o.id}-${note.id}`,
          title: note.body.slice(0, 40) + (note.body.length > 40 ? "…" : ""),
          excerpt: note.body.slice(0, 80),
          linkedEntities,
        });
      }
    }
  }

  return notes;
}

export function buildConnectionsGraph(): ConnectionsGraph {
  const WORK_DETAILS = collectWorkDetails();
  const BILLING_RECORDS = collectBillingRecords();
  const MEMORY_FILES = collectMemoryFiles();
  const NOTES = collectNotes();

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

  for (const p of PEOPLE) {
    nodes.set(nid("person", p.id), {
      id: nid("person", p.id),
      type: "person",
      label: p.name,
      sublabel: p.role,
      href: `/people/${p.id}`,
    });
  }

  for (const o of ORGS) {
    nodes.set(nid("org", o.id), {
      id: nid("org", o.id),
      type: "org",
      label: o.name,
      sublabel: o.industry,
      href: `/orgs/${o.id}`,
    });
  }

  for (const w of WORK_DETAILS) {
    nodes.set(nid("work", w.id), {
      id: nid("work", w.id),
      type: "work",
      label: w.title,
      sublabel: w.status,
      href: `/work/${w.id}`,
    });
  }

  for (const b of BILLING_RECORDS) {
    nodes.set(nid("billing", b.id), {
      id: nid("billing", b.id),
      type: "billing",
      label: b.number,
      sublabel: b.direction === "receivable" ? "Invoice" : "Payable",
      href: `/billing/${encodeURIComponent(b.id)}`,
    });
  }

  for (const f of MEMORY_FILES) {
    nodes.set(nid("file", f.id), {
      id: nid("file", f.id),
      type: "file",
      label: f.name,
      sublabel: f.provider,
      href: "/files",
    });
  }

  for (const n of NOTES) {
    nodes.set(nid("note", n.id), {
      id: nid("note", n.id),
      type: "note",
      label: n.title,
      sublabel: "Note",
      href: "/me",
    });
  }

  for (const p of PEOPLE) {
    if (p.org) addEdge(nid("person", p.id), nid("org", p.org.id));
    for (const w of p.work) addEdge(nid("person", p.id), nid("work", w.id));
  }

  for (const o of ORGS) {
    for (const w of o.work) addEdge(nid("org", o.id), nid("work", w.id));
  }

  for (const b of BILLING_RECORDS) {
    if (b.org) addEdge(nid("billing", b.id), nid("org", b.org.id));
    const counterparty = b.billTo ?? b.payTo;
    if (counterparty) addEdge(nid("billing", b.id), nid("person", counterparty.id));
    if (b.work) addEdge(nid("billing", b.id), nid("work", b.work.id));
  }

  for (const f of MEMORY_FILES) {
    const t = f.linkedTo;
    if (t.kind === "person") addEdge(nid("file", f.id), nid("person", t.id));
    else if (t.kind === "org") addEdge(nid("file", f.id), nid("org", t.id));
    else if (t.kind === "work") addEdge(nid("file", f.id), nid("work", t.id));
  }

  for (const n of NOTES) {
    for (const linked of n.linkedEntities) {
      if (linked.kind === "person") addEdge(nid("note", n.id), nid("person", linked.id));
      else if (linked.kind === "org") addEdge(nid("note", n.id), nid("org", linked.id));
      else if (linked.kind === "work") addEdge(nid("note", n.id), nid("work", linked.id));
    }
  }

  return { nodes: Array.from(nodes.values()), edges };
}

export const TYPE_META: Record<NodeType, { label: string; color: string }> = {
  person: { label: "People", color: "#7FA8C9" },
  org: { label: "Orgs", color: "#E08A5B" },
  work: { label: "Work", color: "#B89BD9" },
  billing: { label: "Billing", color: "#D9A45B" },
  file: { label: "Resources", color: "#E8B4A8" },
  note: { label: "Notes", color: "#9CA3AF" },
};
