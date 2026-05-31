"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Locate, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@repo/ui";
import { cn } from "@repo/utils";

// react-force-graph-2d uses canvas + requestAnimationFrame; load client-side only
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
      Loading graph…
    </div>
  ),
});

/**
 * Interactive force-directed connections graph.
 *
 * Obsidian-style: drag nodes, hover to highlight neighbors, click to focus,
 * scroll to zoom, drag background to pan. Ownership is implied by the workspace;
 * the graph itself shows natural professional clusters.
 */

type NodeType = "person" | "organization" | "project" | "note";

/** Relationship type determines node COLOR */
export type RelationshipType = "revenue" | "collaboration" | "support" | "internal";

/** Status determines node FILL (solid vs hollow) */
export type EntityStatus = "active" | "potential" | "attention";

/** Weight determines node SIZE */
export type EntityWeight = "low" | "medium" | "high";

type RawNode = {
  id: string;
  label: string;
  type: NodeType;
  /** Relationship type → COLOR (green/purple/orange/gray) */
  relationshipType: RelationshipType;
  /** Status → FILL (solid/hollow/ring) */
  status: EntityStatus;
  /** Weight → SIZE (small/medium/large) */
  weight: EntityWeight;
  /** Maps to MOCK_* fixture IDs for navigation */
  entityId?: string;
  /** Initial layout position. Keeps disconnected demo clusters readable without fake links. */
  x?: number;
  y?: number;
};

type RawLink = {
  source: string;
  target: string;
  strength: "strong" | "medium" | "weak";
};

const RAW_NODES: RawNode[] = [
  // Organizations (rounded squares)
  // Active clients = green, filled, size based on value
  { id: "acme", label: "Luma Health", type: "organization", relationshipType: "revenue", status: "active", weight: "high", entityId: "o_acme", x: -80, y: -35 },
  { id: "beta", label: "Helios Advisory", type: "organization", relationshipType: "revenue", status: "attention", weight: "medium", entityId: "o_beta", x: 85, y: -35 },
  // Prospects = green, hollow (potential)
  { id: "helios", label: "Brightline Legal", type: "organization", relationshipType: "revenue", status: "potential", weight: "medium", entityId: "o_helios", x: -145, y: 70 },
  // Past client = green, hollow
  { id: "northwind", label: "Cedar & Co.", type: "organization", relationshipType: "revenue", status: "potential", weight: "low", entityId: "o_northwind", x: 135, y: 90 },
  // Partner = purple, filled
  { id: "vermilion", label: "Vermilion", type: "organization", relationshipType: "collaboration", status: "active", weight: "medium", entityId: "o_vermilion", x: -5, y: 125 },
  // Vendor = orange, filled
  { id: "flux", label: "Atlas Coaching", type: "organization", relationshipType: "support", status: "active", weight: "low", entityId: "o_flux", x: -70, y: 135 },

  // People (circles)
  // Clients = green
  { id: "sarah", label: "Elena Marquez", type: "person", relationshipType: "revenue", status: "active", weight: "high", entityId: "p_sarah_chen", x: -115, y: -60 },
  { id: "alice_acme", label: "Alice Park", type: "person", relationshipType: "revenue", status: "active", weight: "medium", x: -120, y: -10 },
  { id: "mike", label: "Jon Bell", type: "person", relationshipType: "revenue", status: "active", weight: "medium", entityId: "p_mike_hart", x: 120, y: -60 },
  { id: "rachel", label: "Rachel Lee", type: "person", relationshipType: "revenue", status: "active", weight: "low", x: 125, y: -10 },
  // Prospects = green, hollow
  { id: "jane", label: "Priya Shah", type: "person", relationshipType: "revenue", status: "potential", weight: "medium", entityId: "p_jane_park", x: -180, y: 75 },
  { id: "david", label: "David Kim", type: "person", relationshipType: "revenue", status: "potential", weight: "low", entityId: "p_david_kim", x: -105, y: 145 },
  // Past client = green, hollow
  { id: "marcus", label: "Marcus Webb", type: "person", relationshipType: "revenue", status: "potential", weight: "low", entityId: "p_marcus_webb", x: 170, y: 95 },
  // Partner = purple
  { id: "lisa", label: "Lisa Morgan", type: "person", relationshipType: "collaboration", status: "active", weight: "medium", entityId: "p_lisa_morgan", x: 35, y: 130 },

  // Internal team (gray)
  { id: "alice", label: "Alice Chen", type: "person", relationshipType: "internal", status: "active", weight: "medium", entityId: "p_alice_chen", x: -10, y: -95 },
  { id: "bob", label: "Bob Smith", type: "person", relationshipType: "internal", status: "active", weight: "medium", entityId: "p_bob_smith", x: 15, y: -70 },
  { id: "nina", label: "Nina Torres", type: "person", relationshipType: "internal", status: "active", weight: "medium", entityId: "p_nina_torres", x: 40, y: -95 },

  // Projects (diamonds) - inherit relationship from primary client
  { id: "q3_rebrand", label: "Patient Portal Launch", type: "project", relationshipType: "revenue", status: "active", weight: "high", entityId: "proj_q3_rebrand", x: -35, y: -45 },
  { id: "series_a", label: "Brand Strategy Sprint", type: "project", relationshipType: "revenue", status: "active", weight: "high", entityId: "proj_series_a_launch", x: 45, y: -45 },
  { id: "pricing_redesign", label: "Referral Site Expansion", type: "project", relationshipType: "collaboration", status: "active", weight: "medium", entityId: "proj_pricing_redesign", x: -25, y: 0 },

  // Notes (hexagons) - neutral knowledge nodes that make old context visible again
  { id: "note_planning", label: "Annual planning", type: "note", relationshipType: "internal", status: "active", weight: "medium", entityId: "note_001", x: -55, y: -100 },
  { id: "note_series_a", label: "Series A trust", type: "note", relationshipType: "internal", status: "active", weight: "medium", entityId: "note_002", x: 75, y: -95 },
  { id: "note_rebrand_offer", label: "Rebrand pattern", type: "note", relationshipType: "internal", status: "active", weight: "high", entityId: "note_006", x: -20, y: 55 },
];

const RAW_LINKS: RawLink[] = [
  // Luma cluster
  { source: "acme", target: "sarah", strength: "strong" },
  { source: "acme", target: "alice_acme", strength: "medium" },
  { source: "acme", target: "q3_rebrand", strength: "strong" },
  { source: "acme", target: "pricing_redesign", strength: "strong" },

  // Beta cluster
  { source: "beta", target: "mike", strength: "strong" },
  { source: "beta", target: "rachel", strength: "medium" },
  { source: "beta", target: "series_a", strength: "strong" },

  // Other orgs
  { source: "helios", target: "jane", strength: "strong" },
  { source: "northwind", target: "marcus", strength: "medium" },
  { source: "vermilion", target: "lisa", strength: "medium" },
  { source: "flux", target: "david", strength: "strong" },

  // Cross-cluster (the interesting paths)
  { source: "sarah", target: "jane", strength: "weak" }, // referral
  { source: "alice_acme", target: "rachel", strength: "weak" }, // former colleagues

  // Internal team
  { source: "alice", target: "q3_rebrand", strength: "medium" },
  { source: "bob", target: "pricing_redesign", strength: "medium" },
  { source: "nina", target: "series_a", strength: "medium" },

  // Notes surface latent context from old ideas and reflections
  { source: "note_planning", target: "q3_rebrand", strength: "weak" },
  { source: "note_planning", target: "alice", strength: "weak" },
  { source: "note_series_a", target: "mike", strength: "weak" },
  { source: "note_series_a", target: "series_a", strength: "medium" },
  { source: "note_rebrand_offer", target: "acme", strength: "weak" },
  { source: "note_rebrand_offer", target: "helios", strength: "weak" },
  { source: "note_rebrand_offer", target: "beta", strength: "weak" },
];

/** Relationship colors from DESIGN.md */
const RELATIONSHIP_COLORS: Record<RelationshipType, string> = {
  revenue: "#c1f8ae",      // Green - Clients
  collaboration: "#b76dfb", // Purple - Partners
  support: "#ee794d",       // Orange - Vendors
  internal: "#cbcfd8",      // Gray - Team
};

/** Darker versions for rings/strokes */
const RELATIONSHIP_STROKE: Record<RelationshipType, string> = {
  revenue: "#8ae070",
  collaboration: "#9a4de0",
  support: "#d55a2f",
  internal: "#9ca3af",
};

/** Size in pixels for each weight - subtle, minimal sizes */
const WEIGHT_SIZE: Record<EntityWeight, number> = {
  low: 6,
  medium: 9,
  high: 14,
};

/** Draw a rounded rectangle (for organizations) */
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  radius: number
) {
  const half = size / 2;
  const left = x - half;
  const top = y - half;
  ctx.beginPath();
  ctx.moveTo(left + radius, top);
  ctx.lineTo(left + size - radius, top);
  ctx.quadraticCurveTo(left + size, top, left + size, top + radius);
  ctx.lineTo(left + size, top + size - radius);
  ctx.quadraticCurveTo(left + size, top + size, left + size - radius, top + size);
  ctx.lineTo(left + radius, top + size);
  ctx.quadraticCurveTo(left, top + size, left, top + size - radius);
  ctx.lineTo(left, top + radius);
  ctx.quadraticCurveTo(left, top, left + radius, top);
  ctx.closePath();
}

/** Draw a diamond (rotated square, for projects) */
function drawDiamond(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) {
  const half = size / 2;
  ctx.beginPath();
  ctx.moveTo(x, y - half);       // Top
  ctx.lineTo(x + half, y);       // Right
  ctx.lineTo(x, y + half);       // Bottom
  ctx.lineTo(x - half, y);       // Left
  ctx.closePath();
}

/** Draw a hexagon (for notes/ideas) */
function drawHexagon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) {
  const radius = size / 2;
  const angleOffset = Math.PI / 6;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = angleOffset + (i * 2 * Math.PI) / 6;
    const px = x + radius * Math.cos(angle);
    const py = y + radius * Math.sin(angle);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

export type RelationshipFilters = Record<RelationshipType, boolean>;
export type StatusFilters = Record<EntityStatus, boolean>;

export type Filters = {
  people: boolean;
  organizations: boolean;
  projects: boolean;
  notes: boolean;
  relationships: RelationshipFilters;
  statuses: StatusFilters;
};

export type InsightKind =
  | "hub"
  | "underused"
  | "warm_path"
  | "common_neighbors"
  | "risk"
  | "growth"
  | "opportunity"
  | "missing_context";

export type InsightOverlay = {
  entityId: string;
  kind: InsightKind;
};

export type InsightPin = {
  insightId: string;
  anchorEntityId: string;
  shortLabel: string;
  kind: InsightKind;
};

interface InteractiveGraphProps {
  filters: Filters;
  focusEntities?: string[] | null;
  insightOverlay?: InsightOverlay[] | null;
  shouldZoomToFocus?: boolean;
  insightPins?: InsightPin[] | null;
  onInsightPinHover?: (insightId: string | null) => void;
  onInsightPinClick?: (insightId: string) => void;
  simpleMode?: boolean;
}

const INSIGHT_HEX: Record<InsightOverlay["kind"], string> = {
  hub: "#f59e0b",
  underused: "#f97316",
  warm_path: "#10b981",
  common_neighbors: "#8b5cf6",
  risk: "#ef4444",
  growth: "#3b82f6",
  opportunity: "#3b82f6",
  missing_context: "#8b5cf6",
};

function routeForNode(node: RawNode): string | null {
  if (!node.entityId) return null;
  switch (node.type) {
    case "person":
      return `/people/${node.entityId}`;
    case "organization":
      // Reuse the Orgs page for now; query param leaves room for future filtering
      return `/orgs?org=${node.entityId}`;
    case "project":
      return `/work/projects/${node.entityId}`;
    case "note":
      return `/me`;
  }
  return null;
}

export function InteractiveGraph({
  filters,
  focusEntities,
  insightOverlay,
  shouldZoomToFocus = false,
  insightPins,
  onInsightPinHover,
  onInsightPinClick,
  simpleMode = false,
}: InteractiveGraphProps) {
  const router = useRouter();
  const containerRef = React.useRef<HTMLDivElement>(null);
  // Typing the ref loosely because react-force-graph-2d's type exports are flaky
  const fgRef = React.useRef<any>(null);
  const [size, setSize] = React.useState({ width: 0, height: 0 });
  const [hoverId, setHoverId] = React.useState<string | null>(null);
  const hoverTimeoutRef = React.useRef<number | null>(null);

  // Debounced hover handler for smoother feel
  const handleNodeHover = React.useCallback((node: any) => {
    if (hoverTimeoutRef.current) {
      window.clearTimeout(hoverTimeoutRef.current);
    }
    if (node) {
      // Slight delay on hover in too for smoother feel
      hoverTimeoutRef.current = window.setTimeout(() => {
        setHoverId(node.id);
      }, 50);
    } else {
      // Longer delay on hover out
      hoverTimeoutRef.current = window.setTimeout(() => {
        setHoverId(null);
      }, 200);
    }
  }, []);

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        window.clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);
  const [isDark, setIsDark] = React.useState(false);

  // Filter nodes/links based on toggle state (type + relationship + status)
  const { nodes, links } = React.useMemo(() => {
    const isVisible = (n: RawNode) => {
      // Check entity type filter
      if (n.type === "person" && !filters.people) return false;
      if (n.type === "organization" && !filters.organizations) return false;
      if (n.type === "project" && !filters.projects) return false;
      if (n.type === "note" && !filters.notes) return false;

      // Check relationship type filter
      if (!filters.relationships[n.relationshipType]) return false;

      // Check status filter
      if (!filters.statuses[n.status]) return false;

      return true;
    };

    const filteredNodes = RAW_NODES.filter(isVisible);
    const idSet = new Set(filteredNodes.map((n) => n.id));
    const filteredLinks = RAW_LINKS.filter(
      (l) => idSet.has(l.source) && idSet.has(l.target)
    );

    return {
      nodes: filteredNodes.map((n) => ({ ...n })),
      links: filteredLinks.map((l) => ({ ...l })),
    };
  }, [filters]);

  // Lookup sets for focus + overlay
  const focusSet = React.useMemo(
    () => (focusEntities ? new Set(focusEntities) : null),
    [focusEntities]
  );
  const overlayMap = React.useMemo(() => {
    if (!insightOverlay) return null;
    const m = new Map<string, InsightOverlay["kind"]>();
    for (const o of insightOverlay) m.set(o.entityId, o.kind);
    return m;
  }, [insightOverlay]);

  // Build a neighbor lookup for hover highlighting
  const neighborMap = React.useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const n of nodes) map.set(n.id, new Set([n.id]));
    for (const l of links) {
      map.get(l.source as string)?.add(l.target as string);
      map.get(l.target as string)?.add(l.source as string);
    }
    return map;
  }, [nodes, links]);

  // Resize observer
  React.useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const updateSize = () =>
      setSize({ width: el.clientWidth, height: el.clientHeight });
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Detect dark mode
  React.useEffect(() => {
    const detect = () =>
      setIsDark(document.documentElement.classList.contains("dark"));
    detect();
    const observer = new MutationObserver(detect);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  // Text colors for labels - muted, subtle
  const textColor = isDark ? "rgba(250, 250, 250, 0.6)" : "rgba(39, 37, 30, 0.55)";
  const dimTextColor = isDark ? "rgba(250, 250, 250, 0.25)" : "rgba(39, 37, 30, 0.25)";

  // Keep disconnected clusters readable without inventing relationships.
  // Seeded positions define the demo composition; these forces add gentle motion.
  React.useEffect(() => {
    const t = window.setTimeout(() => {
      const graph = fgRef.current;
      if (!graph) return;

      graph.d3Force?.("link")?.distance?.((link: RawLink) => {
        if (link.strength === "strong") return 38;
        if (link.strength === "medium") return 52;
        return 68;
      });
      graph.d3Force?.("charge")?.strength?.(-18);
      graph.d3Force?.("center")?.strength?.(0.18);
      graph.d3ReheatSimulation?.();
    }, 0);

    return () => window.clearTimeout(t);
  }, [links.length, nodes.length]);

  // Fit the natural clusters after initial physics settle
  React.useEffect(() => {
    const t = window.setTimeout(() => {
      if (fgRef.current) {
        fgRef.current.zoomToFit?.(600, 80);
      }
    }, 700);
    return () => window.clearTimeout(t);
  }, [nodes.length]);

  // Re-fit when the canvas resizes (e.g., insights panel toggles)
  React.useEffect(() => {
    if (size.width === 0) return;
    const t = window.setTimeout(() => {
      fgRef.current?.zoomToFit?.(400, 80);
    }, 320);
    return () => window.clearTimeout(t);
  }, [size.width, size.height]);

  // When focus changes and zoom is requested, fit to focused entities
  React.useEffect(() => {
    if (!shouldZoomToFocus || !focusSet || focusSet.size === 0) return;
    const t = window.setTimeout(() => {
      if (fgRef.current?.zoomToFit) {
        fgRef.current.zoomToFit(700, 120, (n: any) => focusSet.has(n.id));
      }
    }, 250);
    return () => window.clearTimeout(t);
  }, [focusSet, shouldZoomToFocus]);

  const handleRecenter = () => {
    fgRef.current?.zoomToFit?.(800, 80);
  };

  const handleZoomIn = () => {
    if (!fgRef.current) return;
    const z = fgRef.current.zoom?.() ?? 1;
    fgRef.current.zoom?.(z * 1.4, 300);
  };

  const handleZoomOut = () => {
    if (!fgRef.current) return;
    const z = fgRef.current.zoom?.() ?? 1;
    fgRef.current.zoom?.(z / 1.4, 300);
  };

  const highlightSet =
    hoverId !== null ? neighborMap.get(hoverId) ?? new Set([hoverId]) : null;

  const hoverNode = hoverId ? nodes.find((n) => n.id === hoverId) : null;
  const hoverIsClickable = !!(hoverNode && routeForNode(hoverNode as RawNode));

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full h-full",
        hoverIsClickable ? "cursor-pointer" : "cursor-default"
      )}
    >

      {/* Floating insight pins layer (HTML overlay above canvas) */}

      {size.width > 0 && (
        <ForceGraph2D
          ref={fgRef}
          graphData={{ nodes, links }}
          width={size.width}
          height={size.height}
          backgroundColor="rgba(0,0,0,0)"
          nodeRelSize={3}
          cooldownTime={5000}
          d3AlphaDecay={0.02}
          d3VelocityDecay={0.4}
          linkColor={(l: any) => {
            const s: string =
              typeof l.source === "object" ? l.source.id : l.source;
            const t: string =
              typeof l.target === "object" ? l.target.id : l.target;
            const isHighlighted =
              highlightSet && highlightSet.has(s) && highlightSet.has(t);
            // Subtle opacity - all links are light
            const baseOpacity =
              l.strength === "strong" ? 0.18 : l.strength === "medium" ? 0.12 : 0.06;
            const opacity =
              highlightSet === null
                ? baseOpacity
                : isHighlighted
                ? Math.min(baseOpacity + 0.15, 0.4)
                : 0.03;
            return isDark
              ? `rgba(250, 250, 250, ${opacity})`
              : `rgba(39, 37, 30, ${opacity})`;
          }}
          linkWidth={(l: any) =>
            // Thinner, more subtle links
            l.strength === "strong" ? 0.8 : l.strength === "medium" ? 0.5 : 0.3
          }
          linkLineDash={(l: any) => {
            const s: string =
              typeof l.source === "object" ? l.source.id : l.source;
            const t: string =
              typeof l.target === "object" ? l.target.id : l.target;
            return s.startsWith("note_") || t.startsWith("note_")
              ? [2, 3]
              : null;
          }}
          onNodeHover={handleNodeHover}
          onNodeClick={(node: any) => {
            const route = routeForNode(node as RawNode);
            if (route) router.push(route);
          }}
          onNodeDragEnd={(node: any) => {
            // Pin node at dropped position
            node.fx = node.x;
            node.fy = node.y;
          }}
          nodeCanvasObject={(node: any, ctx, globalScale) => {
            const isHovered = node.id === hoverId;
            const isFocused = focusSet?.has(node.id) ?? false;
            const inHoverHighlight =
              highlightSet === null || highlightSet.has(node.id);
            const inFocusHighlight = focusSet === null || isFocused;
            const isDim = !inHoverHighlight || !inFocusHighlight;

            // SIMPLE MODE: uniform circles, single neutral color
            if (simpleMode) {
              const size = 7;
              const simpleColor = isDark ? "rgba(250,250,250,0.5)" : "rgba(39,37,30,0.35)";

              ctx.globalAlpha = isDim ? 0.25 : 1;

              // Soft glow
              ctx.shadowColor = simpleColor;
              ctx.shadowBlur = isHovered ? 8 : 4;
              ctx.shadowOffsetX = 0;
              ctx.shadowOffsetY = 0;

              // All circles
              ctx.beginPath();
              ctx.arc(node.x, node.y, size / 2, 0, 2 * Math.PI);
              ctx.fillStyle = simpleColor;
              ctx.fill();

              ctx.shadowBlur = 0;

              // Label
              const labelSize = 5;
              const scaledSize = labelSize / globalScale;
              const clampedSize = Math.max(2, scaledSize);
              ctx.font = `400 ${clampedSize}px "Berkeley Mono", "SF Mono", ui-monospace, monospace`;
              ctx.fillStyle = isDim ? dimTextColor : textColor;
              ctx.textAlign = "center";
              ctx.textBaseline = "top";
              (ctx as any).letterSpacing = `${0.03 * clampedSize}px`;
              const labelOffset = Math.max(2, Math.min(3 / globalScale, 6));
              ctx.fillText(node.label, node.x, node.y + size / 2 + labelOffset);
              (ctx as any).letterSpacing = "0px";

              ctx.globalAlpha = 1;
              return;
            }

            // DETAILED MODE: FOUR-DIMENSION ENCODING
            // 1. SIZE from weight (subtle, minimal)
            const size = WEIGHT_SIZE[node.weight as EntityWeight] || 9;

            // 2. COLOR from relationship type
            const fillColor = RELATIONSHIP_COLORS[node.relationshipType as RelationshipType];
            const strokeColor = RELATIONSHIP_STROKE[node.relationshipType as RelationshipType];

            // 3. FILL from status (solid vs hollow vs attention ring)
            const isFilled = node.status === "active" || node.status === "attention";
            const hasAttentionRing = node.status === "attention";

            // Subtle opacity change - less dramatic on hover
            ctx.globalAlpha = isDim ? 0.4 : 1;

            // Soft glow behind shapes
            const glowIntensity = isHovered ? 12 : 6;
            const glowOpacity = isHovered ? 0.5 : 0.25;
            ctx.shadowColor = hexToRgba(fillColor, glowOpacity);
            ctx.shadowBlur = glowIntensity;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;

            // 4. SHAPE from entity type
            if (node.type === "organization") {
              drawRoundedRect(ctx, node.x, node.y, size, 2);
            } else if (node.type === "project") {
              drawDiamond(ctx, node.x, node.y, size);
            } else if (node.type === "note") {
              drawHexagon(ctx, node.x, node.y, size);
            } else {
              ctx.beginPath();
              ctx.arc(node.x, node.y, size / 2, 0, 2 * Math.PI);
            }

            // Fill or stroke based on status
            if (isFilled) {
              ctx.fillStyle = fillColor;
              ctx.fill();
            } else {
              // Hollow: transparent center with colored stroke
              ctx.fillStyle = isDark ? "#1a1a1a" : "#faf8f5";
              ctx.fill();
            }

            // Reset shadow before stroke (so stroke doesn't double-glow)
            ctx.shadowBlur = 0;

            // Thin stroke - clamped for readability at all zoom levels
            const baseStroke = isFilled ? 0.8 : 1.2;
            ctx.lineWidth = Math.max(0.3, Math.min(baseStroke / globalScale, 2));
            ctx.strokeStyle = isFilled ? strokeColor : fillColor;
            ctx.stroke();

            // Attention ring: subtle darker outer ring (no shadow)
            if (hasAttentionRing) {
              const ringSize = size + 3;
              ctx.lineWidth = Math.max(0.3, Math.min(1.2 / globalScale, 2));
              ctx.strokeStyle = isDark ? "rgba(250,250,250,0.4)" : "rgba(39,37,30,0.35)";
              if (node.type === "organization") {
                drawRoundedRect(ctx, node.x, node.y, ringSize, 3);
              } else if (node.type === "project") {
                drawDiamond(ctx, node.x, node.y, ringSize);
              } else if (node.type === "note") {
                drawHexagon(ctx, node.x, node.y, ringSize);
              } else {
                ctx.beginPath();
                ctx.arc(node.x, node.y, ringSize / 2, 0, 2 * Math.PI);
              }
              ctx.stroke();
            }

            // Reset any remaining shadow state
            ctx.shadowColor = "transparent";

            // Label - mono font, tiny, muted, with tracking
            // Fonts shrink as you zoom in (no max clamp)
            const baseLabelSize = 5;
            const scaledSize = baseLabelSize / globalScale;
            const clampedSize = Math.max(2, scaledSize); // Only min clamp, no max
            ctx.font = `400 ${clampedSize}px "Berkeley Mono", "SF Mono", ui-monospace, monospace`;
            ctx.fillStyle = isDim ? dimTextColor : textColor;
            ctx.textAlign = "center";
            ctx.textBaseline = "top";
            // Add letter spacing (tracking) - subtle
            (ctx as any).letterSpacing = `${0.03 * clampedSize}px`;
            // Label offset - clamped for readability
            const labelOffset = Math.max(2, Math.min(3 / globalScale, 6));
            ctx.fillText(
              node.label,
              node.x,
              node.y + size / 2 + labelOffset
            );
            // Reset letter spacing
            (ctx as any).letterSpacing = "0px";

            ctx.globalAlpha = 1;
          }}
          nodePointerAreaPaint={(node: any, color, ctx) => {
            // Generous hit area — at least 18px regardless of visual size
            const size = WEIGHT_SIZE[node.weight as EntityWeight] || 16;
            const hitRadius = Math.max(size / 2 + 8, 18);
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(node.x, node.y, hitRadius, 0, 2 * Math.PI);
            ctx.fill();
          }}
        />
      )}
    </div>
  );
}

function InsightFloatingPin({
  pin,
  x,
  y,
  isDark,
  onMouseEnter,
  onMouseLeave,
  onClick,
}: {
  pin: InsightPin;
  x: number;
  y: number;
  isDark: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClick: () => void;
}) {
  const color = INSIGHT_HEX[pin.kind];
  // Position above the node with a slight vertical offset
  const offsetY = -38;

  return (
    <div
      className="absolute pointer-events-auto select-none"
      style={{
        left: x,
        top: y + offsetY,
        transform: "translate(-50%, 0)",
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
    >
      <button
        type="button"
        className={cn(
          "group inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium",
          "transition-all cursor-pointer whitespace-nowrap",
          "shadow-sm hover:shadow-md hover:-translate-y-0.5"
        )}
        style={{
          color,
          backgroundColor: hexToRgba(color, isDark ? 0.18 : 0.12),
          border: `1px solid ${hexToRgba(color, isDark ? 0.4 : 0.3)}`,
        }}
      >
        <span
          className="size-1.5 rounded-full"
          style={{ backgroundColor: color }}
        />
        {pin.shortLabel}
      </button>
      {/* tiny connector dot pointing down toward the anchor node */}
      <div
        aria-hidden
        className="mx-auto mt-0.5 size-0.5 rounded-full"
        style={{ backgroundColor: hexToRgba(color, 0.5) }}
      />
    </div>
  );
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function ControlButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        "h-7 w-7 bg-background/80 backdrop-blur",
        "shadow-sm hover:bg-background"
      )}
    >
      {children}
    </Button>
  );
}
