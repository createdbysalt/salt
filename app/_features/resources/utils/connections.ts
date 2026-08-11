import { nodeId, type ConnectionNode } from "@/app/_features/connections/types";
import { hasDisplayableFileConnection, type MemoryFile } from "../data";
import type { FileDetailRecord } from "../detail-types";

function hrefForKind(kind: MemoryFile["linkedTo"]["kind"], id: string): string {
  switch (kind) {
    case "person":
      return `/people/${id}`;
    case "org":
      return `/orgs/${id}`;
    case "work":
      return `/work/${id}`;
    case "billing":
      return `/billing/${id}`;
    case "meeting":
      return `/meetings/${id}`;
  }
}

function addConnection(map: Map<string, ConnectionNode>, node: ConnectionNode) {
  map.set(node.id, node);
}

export function buildFileConnectionNodes(
  file: MemoryFile,
  fileDetail?: FileDetailRecord | null,
): ConnectionNode[] {
  const map = new Map<string, ConnectionNode>();

  for (const person of fileDetail?.linkedPeople ?? []) {
    addConnection(map, {
      id: nodeId("person", person.id),
      nodeType: "person",
      label: person.name,
      href: hrefForKind("person", person.id),
    });
  }

  for (const org of fileDetail?.linkedOrgs ?? []) {
    addConnection(map, {
      id: nodeId("org", org.id),
      nodeType: "org",
      label: org.name,
      href: hrefForKind("org", org.id),
    });
  }

  for (const work of fileDetail?.linkedWork ?? []) {
    addConnection(map, {
      id: nodeId("work", work.id),
      nodeType: "work",
      label: work.title,
      href: hrefForKind("work", work.id),
    });
  }

  // Legacy single-link fallback from list row data (person_id / project_id)
  if (hasDisplayableFileConnection(file.linkedTo)) {
    const kind = file.linkedTo.kind;
    const legacyNodeId = nodeId(kind, file.linkedTo.id);
    if (!map.has(legacyNodeId)) {
      addConnection(map, {
        id: legacyNodeId,
        nodeType: kind,
        label: file.linkedTo.name,
        href: hrefForKind(kind, file.linkedTo.id),
      });
    }
  }

  return Array.from(map.values());
}
