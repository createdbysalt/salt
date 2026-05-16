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
 * scroll to zoom, drag background to pan. "You" node has higher mass so
 * it tends toward center.
 */

type NodeType = "you" | "person" | "organization" | "project";

export type PersonStatus =
  | "client"
  | "prospect"
  | "past_client"
  | "partner"
  | "vendor"
  | "internal";

type RawNode = {
  id: string;
  label: string;
  type: NodeType;
  /** for people, the relationship status; for orgs, the relationship status too */
  status?: PersonStatus;
  /** MRR (for organizations) — drives node size */
  mrr?: number;
  /** Outstanding overdue amount (for organizations) — drives warn ring */
  overdue?: number;
  /** Action volume (any entity) — drives subtle activity pulse */
  recentActionCount?: number;
  /** Maps to MOCK_* fixture IDs for navigation */
  entityId?: string;
};

type RawLink = {
  source: string;
  target: string;
  strength: "strong" | "medium" | "weak";
};

const RAW_NODES: RawNode[] = [
  { id: "you", label: "You", type: "you", entityId: "p_you" },

  // Organizations (mrr drives node size; overdue drives a warn ring)
  { id: "acme", label: "Acme Corp", type: "organization", status: "client", mrr: 12500, recentActionCount: 12, entityId: "o_acme" },
  { id: "beta", label: "Beta Inc", type: "organization", status: "client", mrr: 8000, overdue: 3500, recentActionCount: 8, entityId: "o_beta" },
  { id: "helios", label: "Helios Studio", type: "organization", status: "prospect", mrr: 0, recentActionCount: 2, entityId: "o_helios" },
  { id: "northwind", label: "Northwind Co", type: "organization", status: "past_client", mrr: 0, recentActionCount: 1, entityId: "o_northwind" },
  { id: "vermilion", label: "Vermilion", type: "organization", status: "partner", mrr: 0, recentActionCount: 1, entityId: "o_vermilion" },
  { id: "flux", label: "Flux FM", type: "organization", status: "prospect", mrr: 0, recentActionCount: 1, entityId: "o_flux" },

  // People (status inherited from primary org or own status)
  { id: "sarah", label: "Sarah Chen", type: "person", status: "client", entityId: "p_sarah_chen" },
  { id: "alice_acme", label: "Alice Park", type: "person", status: "client" /* no mock entity yet */ },
  { id: "mike", label: "Mike Hart", type: "person", status: "client", entityId: "p_mike_hart" },
  { id: "rachel", label: "Rachel Lee", type: "person", status: "client" /* no mock entity yet */ },
  { id: "jane", label: "Jane Park", type: "person", status: "prospect", entityId: "p_jane_park" },
  { id: "marcus", label: "Marcus Webb", type: "person", status: "past_client", entityId: "p_marcus_webb" },
  { id: "lisa", label: "Lisa Morgan", type: "person", status: "partner", entityId: "p_lisa_morgan" },
  { id: "david", label: "David Kim", type: "person", status: "prospect", entityId: "p_david_kim" },

  // Internal team
  { id: "alice", label: "Alice Chen", type: "person", status: "internal", entityId: "p_alice_chen" },
  { id: "bob", label: "Bob Smith", type: "person", status: "internal", entityId: "p_bob_smith" },
  { id: "nina", label: "Nina Torres", type: "person", status: "internal", entityId: "p_nina_torres" },

  // Projects
  { id: "q3_rebrand", label: "Q3 Rebrand", type: "project", entityId: "proj_q3_rebrand" },
  { id: "series_a", label: "Series A Launch", type: "project", entityId: "proj_series_a_launch" },
  { id: "pricing_redesign", label: "Pricing Redesign", type: "project", entityId: "proj_pricing_redesign" },
];

const RAW_LINKS: RawLink[] = [
  // You ↔ Orgs
  { source: "you", target: "acme", strength: "strong" },
  { source: "you", target: "beta", strength: "strong" },
  { source: "you", target: "helios", strength: "medium" },
  { source: "you", target: "northwind", strength: "weak" },
  { source: "you", target: "vermilion", strength: "medium" },
  { source: "you", target: "flux", strength: "medium" },

  // Acme cluster
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

  // Project ↔ You
  { source: "you", target: "q3_rebrand", strength: "strong" },
  { source: "you", target: "series_a", strength: "strong" },
  { source: "you", target: "pricing_redesign", strength: "medium" },

  // Cross-cluster (the interesting paths)
  { source: "sarah", target: "jane", strength: "weak" }, // referral
  { source: "alice_acme", target: "rachel", strength: "weak" }, // former colleagues

  // Internal team
  { source: "you", target: "alice", strength: "strong" },
  { source: "you", target: "bob", strength: "strong" },
  { source: "you", target: "nina", strength: "strong" },
  { source: "alice", target: "q3_rebrand", strength: "medium" },
  { source: "bob", target: "pricing_redesign", strength: "medium" },
  { source: "nina", target: "series_a", strength: "medium" },
];

const COLORS = {
  you: { fill: "#0a0a0a", glow: "rgba(10, 10, 10, 0.15)" },
  person: { fill: "#ec4899", glow: "rgba(236, 72, 153, 0.15)" },
  organization: { fill: "#3b82f6", glow: "rgba(59, 130, 246, 0.15)" },
  project: { fill: "#6366f1", glow: "rgba(99, 102, 241, 0.15)" },
};

const DARK_COLORS = {
  you: { fill: "#fafafa", glow: "rgba(250, 250, 250, 0.2)" },
  person: { fill: "#f472b6", glow: "rgba(244, 114, 182, 0.18)" },
  organization: { fill: "#60a5fa", glow: "rgba(96, 165, 250, 0.18)" },
  project: { fill: "#818cf8", glow: "rgba(129, 140, 248, 0.18)" },
};

export type PersonStatusFilters = Record<PersonStatus, boolean>;

export type Filters = {
  people: boolean;
  organizations: boolean;
  projects: boolean;
  personStatuses: PersonStatusFilters;
};

export type InsightKind =
  | "hub"
  | "underused"
  | "warm_path"
  | "common_neighbors"
  | "risk"
  | "growth";

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
  insightPins?: InsightPin[] | null;
  onInsightPinHover?: (insightId: string | null) => void;
  onInsightPinClick?: (insightId: string) => void;
}

const INSIGHT_HEX: Record<InsightOverlay["kind"], string> = {
  hub: "#f59e0b",
  underused: "#f97316",
  warm_path: "#10b981",
  common_neighbors: "#8b5cf6",
  risk: "#ef4444",
  growth: "#3b82f6",
};

function routeForNode(node: RawNode): string | null {
  if (node.type === "you") return null;
  if (!node.entityId) return null;
  switch (node.type) {
    case "person":
      return `/people/${node.entityId}`;
    case "organization":
      // Reuse the People page for now; query param leaves room for future filtering
      return `/people?org=${node.entityId}`;
    case "project":
      return `/work/projects/${node.entityId}`;
  }
  return null;
}

export function InteractiveGraph({
  filters,
  focusEntities,
  insightOverlay,
  insightPins,
  onInsightPinHover,
  onInsightPinClick,
}: InteractiveGraphProps) {
  const router = useRouter();
  const containerRef = React.useRef<HTMLDivElement>(null);
  // Typing the ref loosely because react-force-graph-2d's type exports are flaky
  const fgRef = React.useRef<any>(null);
  const [size, setSize] = React.useState({ width: 0, height: 0 });
  const [hoverId, setHoverId] = React.useState<string | null>(null);
  const [isDark, setIsDark] = React.useState(false);

  // Filter nodes/links based on toggle state (type + person sub-status)
  const { nodes, links } = React.useMemo(() => {
    const isVisible = (n: RawNode) => {
      if (n.type === "you") return true;
      if (n.type === "person") {
        if (!filters.people) return false;
        if (n.status && !filters.personStatuses[n.status]) return false;
        return true;
      }
      if (n.type === "organization") return filters.organizations;
      if (n.type === "project") return filters.projects;
      return false;
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

  const palette = isDark ? DARK_COLORS : COLORS;

  // Center on "you" after initial physics settle
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

  // When focus changes, fit to focused entities
  React.useEffect(() => {
    if (!focusSet || focusSet.size === 0) return;
    const t = window.setTimeout(() => {
      if (fgRef.current?.zoomToFit) {
        fgRef.current.zoomToFit(700, 120, (n: any) => focusSet.has(n.id));
      }
    }, 250);
    return () => window.clearTimeout(t);
  }, [focusSet]);

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
          nodeRelSize={5}
          cooldownTime={4000}
          d3AlphaDecay={0.03}
          d3VelocityDecay={0.35}
          linkColor={(l: any) => {
            const s: string =
              typeof l.source === "object" ? l.source.id : l.source;
            const t: string =
              typeof l.target === "object" ? l.target.id : l.target;
            const isHighlighted =
              highlightSet && highlightSet.has(s) && highlightSet.has(t);
            const baseOpacity =
              l.strength === "strong" ? 0.5 : l.strength === "medium" ? 0.3 : 0.18;
            const opacity =
              highlightSet === null
                ? baseOpacity
                : isHighlighted
                ? Math.min(baseOpacity + 0.2, 0.8)
                : 0.04;
            return isDark
              ? `rgba(250, 250, 250, ${opacity})`
              : `rgba(10, 10, 10, ${opacity})`;
          }}
          linkWidth={(l: any) =>
            l.strength === "strong" ? 1.4 : l.strength === "medium" ? 0.9 : 0.6
          }
          onNodeHover={(n: any) => setHoverId(n ? n.id : null)}
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
            const isYou = node.type === "you";
            const isHovered = node.id === hoverId;
            const isFocused = focusSet?.has(node.id) ?? false;
            const inHoverHighlight =
              highlightSet === null || highlightSet.has(node.id);
            const inFocusHighlight = focusSet === null || isFocused;
            // Dim if either: hover-faded OR focus-faded (focus wins)
            const isDim = !inHoverHighlight || !inFocusHighlight;

            // Org radius scales with MRR (range 5-11). People = 5. You = 9.
            const orgRadius =
              node.type === "organization"
                ? 5 + Math.min(6, Math.sqrt(((node.mrr as number) ?? 0) / 200))
                : 0;
            const radius = isYou
              ? 9
              : node.type === "organization"
              ? orgRadius
              : 5;
            const color = palette[node.type as NodeType];
            const hasOverdue =
              node.type === "organization" && (node.overdue as number) > 0;
            const insightKind = overlayMap?.get(node.id);
            const insightColor = insightKind ? INSIGHT_HEX[insightKind] : null;

            ctx.globalAlpha = isDim ? 0.18 : 1;

            // Insight overlay halo (largest ring, drawn first behind)
            if (insightColor) {
              ctx.beginPath();
              ctx.arc(node.x, node.y, radius + 7, 0, 2 * Math.PI);
              ctx.fillStyle = hexToRgba(insightColor, 0.18);
              ctx.fill();
            }

            // Focus pulse ring (between insight halo and node)
            if (isFocused) {
              ctx.beginPath();
              ctx.arc(node.x, node.y, radius + 5, 0, 2 * Math.PI);
              ctx.fillStyle = hexToRgba(
                insightColor ?? "#0a0a0a",
                isDark ? 0.3 : 0.18
              );
              ctx.fill();
            }

            // Glow ring for "you" or hovered
            if ((isYou || isHovered) && !insightColor && !isFocused) {
              ctx.beginPath();
              ctx.arc(node.x, node.y, radius + 5, 0, 2 * Math.PI);
              ctx.fillStyle = color.glow;
              ctx.fill();
            }

            // Node circle
            ctx.beginPath();
            ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
            ctx.fillStyle = color.fill;
            ctx.fill();

            // Stroke ring: insight > focus > hover > you > overdue
            if (insightColor) {
              ctx.lineWidth = 1.6 / globalScale;
              ctx.strokeStyle = insightColor;
              ctx.stroke();
            } else if (isFocused) {
              ctx.lineWidth = 1.8 / globalScale;
              ctx.strokeStyle = color.fill;
              ctx.stroke();
            } else if (isYou || isHovered) {
              ctx.lineWidth = 1.5 / globalScale;
              ctx.strokeStyle = color.fill;
              ctx.stroke();
            } else if (hasOverdue) {
              // Subtle red ring for orgs with overdue payments
              ctx.lineWidth = 1.4 / globalScale;
              ctx.strokeStyle = "#ef4444";
              ctx.stroke();
            }

            // Label
            const labelSize = isYou || isFocused ? 13 : 11;
            ctx.font = `${labelSize / globalScale}px Inter, system-ui, sans-serif`;
            ctx.fillStyle = isDark
              ? `rgba(250, 250, 250, ${isYou || isFocused ? 0.95 : 0.75})`
              : `rgba(10, 10, 10, ${isYou || isFocused ? 0.95 : 0.75})`;
            ctx.textAlign = "center";
            ctx.textBaseline = "top";
            ctx.fillText(
              node.label,
              node.x,
              node.y + radius + 4 / globalScale
            );

            ctx.globalAlpha = 1;
          }}
          nodePointerAreaPaint={(node: any, color, ctx) => {
            // Generous hit area — at least 14px regardless of visual size
            const orgVisualRadius =
              node.type === "organization"
                ? 5 + Math.min(6, Math.sqrt(((node.mrr as number) ?? 0) / 200))
                : 0;
            const visualRadius =
              node.type === "you"
                ? 9
                : node.type === "organization"
                ? orgVisualRadius
                : 5;
            const hitRadius = Math.max(visualRadius + 8, 14);
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
