/**
 * Unified Connections Types
 *
 * Everything in Salt is a node. Everything connects.
 * The graph is how you see your knowledge.
 */

export type NodeType = "person" | "org" | "work" | "billing" | "file" | "note" | "conversation" | "meeting" | "resource";

/**
 * Base node that every connected entity resolves to.
 * Used by the graph AND the unified Connections tab.
 */
export type ConnectionNode = {
  /** Composite ID: "person:uuid" | "billing:inv_xxx" */
  id: string;
  /** Entity type for shape/icon selection */
  nodeType: NodeType;
  /** Display name */
  label: string;
  /** Secondary info (title, status, amount) */
  sublabel?: string;
  /** Detail page link */
  href?: string;
  /** Type-specific metadata for detail panel */
  metadata?: ConnectionMetadata;
};

/**
 * Discriminated union for type-specific metadata.
 * Graph doesn't need this, but detail views do.
 */
export type ConnectionMetadata =
  | { type: "person"; title?: string; email?: string }
  | { type: "org"; industry?: string }
  | { type: "work"; status: string; dueDate?: string }
  | {
      type: "billing";
      amountCents: number;
      currency: string;
      status: string;
      direction: "receivable" | "payable";
    }
  | { type: "file"; fileName: string; mimeType?: string; sizeBytes?: number }
  | { type: "note"; excerpt: string }
  | { type: "meeting"; startTime: string; status: string }
  | { type: "conversation"; preview?: string }
  | {
      type: "resource";
      resourceType: string;
      resourceUrl?: string;
      mode: "static" | "live";
      lastActivityAt?: string;
      lastActivitySummary?: string;
    };

/**
 * Edge between two nodes.
 */
export type ConnectionEdge = {
  source: string;
  target: string;
  edgeType?:
    | "employment"
    | "ownership"
    | "payment"
    | "attachment"
    | "mention"
    | "related";
};

/**
 * Full graph structure for visualization.
 */
export type ConnectionsGraph = {
  nodes: ConnectionNode[];
  edges: ConnectionEdge[];
};

/**
 * Graph node for visualization (backward compatible).
 * Uses `type` field for existing graph components.
 */
export type GraphNode = {
  id: string;
  type: NodeType;
  label: string;
  sublabel?: string;
  href?: string;
  /** Fill dimension: solid = active, outline = inactive (people/orgs only). */
  recordStatus?: "active" | "inactive";
  /** Color dimension source: canonical relationship slug (people/orgs only). */
  relationship?: string;
};

export type GraphEdge = {
  source: string;
  target: string;
  edgeType?: "employment" | "payment" | "attachment" | "mention" | "related" | "structural";
};

/**
 * Legacy graph structure used by ConnectionsPage.
 */
export type LegacyConnectionsGraph = {
  nodes: GraphNode[];
  edges: GraphEdge[];
};

/**
 * Helper to create composite node IDs.
 */
export const nodeId = (type: NodeType, id: string) => `${type}:${id}`;

/**
 * Parse a composite node ID back to type and id.
 */
export const parseNodeId = (
  compositeId: string
): { type: NodeType; id: string } | null => {
  const [type, ...rest] = compositeId.split(":");
  const id = rest.join(":");
  if (!type || !id) return null;
  return { type: type as NodeType, id };
};

/**
 * Visual metadata per node type.
 * Shape encoding follows the Graph Visual System:
 * - Circle = People
 * - Square = Orgs
 * - Diamond = Work
 * - Rounded rect = Billing/Files/Notes
 */
export const NODE_TYPE_META: Record<
  NodeType,
  { label: string; shape: "circle" | "square" | "diamond" | "rect" }
> = {
  person: { label: "People", shape: "circle" },
  org: { label: "Orgs", shape: "square" },
  work: { label: "Work", shape: "diamond" },
  billing: { label: "Billing", shape: "rect" },
  file: { label: "Files", shape: "rect" },
  note: { label: "Notes", shape: "rect" },
  conversation: { label: "Conversations", shape: "rect" },
  meeting: { label: "Meetings", shape: "rect" },
  resource: { label: "Resources", shape: "rect" },
};

/**
 * Backward compatible TYPE_META for existing components.
 * Colors match the demo file; shape info available in NODE_TYPE_META.
 */
export const TYPE_META: Record<NodeType, { label: string; color: string }> = {
  person: { label: "People", color: "#7FA8C9" },
  org: { label: "Orgs", color: "#E08A5B" },
  work: { label: "Work", color: "#B89BD9" },
  billing: { label: "Billing", color: "#D9A45B" },
  file: { label: "Files", color: "#E8B4A8" },
  note: { label: "Notes", color: "#9CA3AF" },
  conversation: { label: "Conversations", color: "#818CF8" },
  meeting: { label: "Meetings", color: "#F59E0B" },
  resource: { label: "Resources", color: "#10B981" },
};
