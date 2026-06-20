"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Crosshair, Sparkles, Circle } from "lucide-react";
import type ForceGraph2DType from "react-force-graph-2d";
import type { ForceGraphMethods, NodeObject, LinkObject } from "react-force-graph-2d";

import { buildConnectionsGraph, TYPE_META, type GraphNode, type NodeType, type ConnectionsGraph as ConnectionsGraphData } from "@/app/_lib/demo/connections-graph-data";
import { useMockContent } from "@/app/_features/shell/contexts/DashboardUserContext";
import { MockContentEmptyState } from "@/app/_features/shell/components/MockContentEmptyState";
import { GraphFilterBar } from "./GraphFilterBar";
import { GraphDetailPanel } from "./GraphDetailPanel";

type FGNode = NodeObject &
  GraphNode & {
    degree: number;
  };
type FGLink = LinkObject<FGNode>;

const TYPES: NodeType[] = ["person", "org", "work", "billing", "file", "note"];

function nodeRadius(degree: number) {
  return 3 + Math.min(8, Math.sqrt(degree) * 1.8);
}

interface ConnectionsGraphProps {
  /** Real data from the database. If provided, used when mockContent is false. */
  initialData?: ConnectionsGraphData;
}

export function ConnectionsGraph({ initialData }: ConnectionsGraphProps) {
  const mockContent = useMockContent();
  // Lazy-load the lib in the browser only (it touches Canvas / window at import time)
  type ForceGraphComponent = typeof ForceGraph2DType;
  const [ForceGraph2D, setForceGraph2D] = useState<ForceGraphComponent | null>(null);
  useEffect(() => {
    let alive = true;
    import("react-force-graph-2d").then((m) => {
      if (alive) setForceGraph2D(() => m.default as unknown as ForceGraphComponent);
    });
    return () => { alive = false; };
  }, []);

  const fgRef = useRef<ForceGraphMethods<FGNode, FGLink> | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  // Track container size for the canvas
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  // Build graph data once
  const { allNodes, allLinks, adjacency, counts, nodesById } = useMemo(() => {
    // Determine data source: demo data (mockContent) or real data (initialData)
    let graphSource: ConnectionsGraphData | null = null;

    if (mockContent) {
      graphSource = buildConnectionsGraph();
    } else if (initialData && (initialData.nodes.length > 0 || initialData.edges.length > 0)) {
      graphSource = initialData;
    }

    if (!graphSource) {
      const emptyCounts: Record<NodeType, number> = {
        person: 0,
        org: 0,
        work: 0,
        billing: 0,
        file: 0,
        note: 0,
      };
      return {
        allNodes: [] as FGNode[],
        allLinks: [] as FGLink[],
        adjacency: new Map<string, Set<string>>(),
        counts: emptyCounts,
        nodesById: new Map<string, FGNode>(),
      };
    }
    const { nodes, edges } = graphSource;
    const degree = new Map<string, number>();
    for (const e of edges) {
      degree.set(e.source, (degree.get(e.source) ?? 0) + 1);
      degree.set(e.target, (degree.get(e.target) ?? 0) + 1);
    }
    const allNodes: FGNode[] = nodes.map((n) => ({ ...n, degree: degree.get(n.id) ?? 0 }));
    const nodesById = new Map(allNodes.map((n) => [n.id, n]));
    const allLinks: FGLink[] = edges.map((e) => ({ source: e.source, target: e.target } as FGLink));
    const adjacency = new Map<string, Set<string>>();
    for (const e of edges) {
      if (!adjacency.has(e.source)) adjacency.set(e.source, new Set());
      if (!adjacency.has(e.target)) adjacency.set(e.target, new Set());
      adjacency.get(e.source)!.add(e.target);
      adjacency.get(e.target)!.add(e.source);
    }
    const counts: Record<NodeType, number> = { person: 0, org: 0, work: 0, billing: 0, file: 0, note: 0 };
    for (const n of allNodes) counts[n.type]++;
    return { allNodes, allLinks, adjacency, counts, nodesById };
  }, [mockContent, initialData]);

  // Filters
  const [active, setActive] = useState<Set<NodeType>>(new Set(TYPES));
  const toggleType = (t: NodeType) => {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      if (next.size === 0) return new Set(TYPES);
      return next;
    });
  };

  // Filtered data passed to the graph
  const graphData = useMemo(() => {
    const nodes = allNodes.filter((n) => active.has(n.type));
    const allowed = new Set(nodes.map((n) => n.id));
    const links = allLinks.filter((l) => {
      const s = typeof l.source === "object" ? (l.source as FGNode).id : (l.source as string);
      const t = typeof l.target === "object" ? (l.target as FGNode).id : (l.target as string);
      return allowed.has(s) && allowed.has(t);
    });
    return { nodes, links };
  }, [allNodes, allLinks, active]);

  // Search
  const [query, setQuery] = useState("");
  const suggestions = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return allNodes
      .filter((n) => n.label.toLowerCase().includes(q) || (n.sublabel?.toLowerCase().includes(q) ?? false))
      .slice(0, 12);
  }, [query, allNodes]);

  // Hover / selection
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [plain, setPlain] = useState(false);
  const focusId = hoverId ?? selectedId;
  const neighbors = focusId ? adjacency.get(focusId) ?? new Set<string>() : null;


  // Theme-aware stroke color (sampled once on mount; close enough for the prototype)
  const [bgStroke, setBgStroke] = useState("rgba(255,255,255,0.9)");
  useEffect(() => {
    const root = getComputedStyle(document.documentElement);
    const bg = root.getPropertyValue("--background").trim();
    if (bg) setBgStroke(`oklch(${bg})`);
  }, []);

  // Focus a node (search / neighbor click)
  const focusNode = useCallback((id: string) => {
    const n = nodesById.get(id);
    if (!n || n.x == null || n.y == null) return;
    fgRef.current?.centerAt(n.x, n.y, 700);
    fgRef.current?.zoom(2.4, 700);
    setSelectedId(id);
    setQuery("");
  }, [nodesById]);

  const recenter = () => fgRef.current?.zoomToFit(500, 80);

  // Tooltip — convert graph coords to screen coords on demand
  const [hoverScreenPos, setHoverScreenPos] = useState<{ x: number; y: number } | null>(null);
  useEffect(() => {
    if (!hoverId) { setHoverScreenPos(null); return; }
    let raf = 0;
    const tick = () => {
      const n = nodesById.get(hoverId);
      if (n && n.x != null && n.y != null && fgRef.current) {
        const p = fgRef.current.graph2ScreenCoords(n.x, n.y);
        setHoverScreenPos({ x: p.x, y: p.y });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [hoverId, nodesById]);

  // Canvas painters — matte discs by default; gradient orbs for hubs and focused nodes.
  // In plain mode: every node is a flat neutral gray disc, no halo, no gradient.
  const paintNode = useCallback((node: NodeObject, ctx: CanvasRenderingContext2D) => {
    const n = node as FGNode;
    if (n.x == null || n.y == null) return;
    const baseR = nodeRadius(n.degree);
    const isHover = hoverId === n.id;
    const isSelected = selectedId === n.id;
    const isNeighbor = neighbors?.has(n.id);
    const isFocused = isHover || isSelected;
    const dim = focusId && !isFocused && !isNeighbor;
    const isHub = n.degree >= 5;
    const isOrb = !plain && (isHub || isFocused);
    const color = plain ? "#6B7280" : TYPE_META[n.type].color;
    const r = isFocused ? baseR * 1.22 : baseR;

    ctx.globalAlpha = dim ? 0.18 : 1;

    // Halo — only in vibey mode.
    if (!plain) {
      const haloR = r * (isOrb ? 4.2 : 3.0);
      const halo = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, haloR);
      halo.addColorStop(0, color + (isFocused ? "55" : isHub ? "33" : "22"));
      halo.addColorStop(0.5, color + "10");
      halo.addColorStop(1, color + "00");
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(n.x, n.y, haloR, 0, Math.PI * 2);
      ctx.fill();
    }

    // Selected: a hairline focus ring.
    if (isSelected) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.globalAlpha = (dim ? 0.18 : 1) * (plain ? 0.7 : 0.5);
      ctx.beginPath();
      ctx.arc(n.x, n.y, r + 4.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = dim ? 0.18 : 1;
    }

    if (isOrb) {
      const grad = ctx.createRadialGradient(
        n.x - r * 0.45,
        n.y - r * 0.5,
        r * 0.1,
        n.x,
        n.y,
        r * 1.05,
      );
      grad.addColorStop(0, color + "FF");
      grad.addColorStop(0.45, color + "E6");
      grad.addColorStop(1, color + "55");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = plain ? color : color + "E6";
      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  }, [hoverId, selectedId, focusId, neighbors, plain]);


  const paintPointerArea = useCallback((node: NodeObject, color: string, ctx: CanvasRenderingContext2D) => {
    const n = node as FGNode;
    if (n.x == null || n.y == null) return;
    const r = nodeRadius(n.degree) + 4;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
    ctx.fill();
  }, []);

  // Barely-there links: cream/foreground hairlines, brighter only when touching focus.
  const linkColor = useCallback((link: LinkObject) => {
    const s = typeof link.source === "object" ? (link.source as FGNode).id : (link.source as string);
    const t = typeof link.target === "object" ? (link.target as FGNode).id : (link.target as string);
    const touchesFocus = focusId && (s === focusId || t === focusId);
    if (touchesFocus) {
      if (plain) return "rgba(75,85,99,0.75)";
      const focusType = nodesById.get(focusId)?.type;
      return focusType ? TYPE_META[focusType].color + "80" : "rgba(160,160,160,0.5)";
    }
    if (focusId) return "rgba(160,160,160,0.05)";
    return "rgba(160,160,160,0.16)";
  }, [focusId, nodesById, plain]);

  const linkWidth = useCallback((link: LinkObject) => {
    const s = typeof link.source === "object" ? (link.source as FGNode).id : (link.source as string);
    const t = typeof link.target === "object" ? (link.target as FGNode).id : (link.target as string);
    return focusId && (s === focusId || t === focusId) ? 1.1 : 0.55;
  }, [focusId]);



  // Initial zoom-to-fit once the sim cools
  const fittedRef = useRef(false);
  const onEngineStop = useCallback(() => {
    if (fittedRef.current) return;
    fittedRef.current = true;
    fgRef.current?.zoomToFit(400, 80);
  }, []);

  // Configure forces for a tight Obsidian-style circular cluster
  const forcesConfiguredRef = useRef(false);
  useEffect(() => {
    if (!ForceGraph2D || !fgRef.current || forcesConfiguredRef.current) return;
    const fg = fgRef.current;
    const center = fg.d3Force("center") as { strength?: (n: number) => unknown } | undefined;
    center?.strength?.(1);

    const charge = fg.d3Force("charge") as {
      strength?: (n: number) => unknown;
      distanceMax?: (n: number) => unknown;
    } | undefined;
    charge?.strength?.(-120);
    charge?.distanceMax?.(420);

    const linkForce = fg.d3Force("link") as {
      distance?: (d: number) => unknown;
      strength?: (s: number) => unknown;
    } | undefined;
    linkForce?.distance?.(72);
    linkForce?.strength?.(0.55);
    fg.d3ReheatSimulation();
    forcesConfiguredRef.current = true;
  }, [ForceGraph2D, size.w, size.h]);


  const hoverNode = hoverId ? nodesById.get(hoverId) : null;
  const selectedNode = selectedId ? nodesById.get(selectedId) : null;
  const selectedNeighbors = selectedNode
    ? Array.from(adjacency.get(selectedNode.id) ?? []).map((id) => nodesById.get(id)!).filter(Boolean)
    : [];

  if (!mockContent) {
    return (
      <MockContentEmptyState
        className="h-full min-h-[480px] rounded-3xl"
        title="No connection graph yet"
        description="People, orgs, work, and files will appear here as relationships form."
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden rounded-3xl border border-border/60 shadow-[var(--shadow-card)]"
      style={{ background: "#ffffff" }}
    >



      <GraphFilterBar
        counts={counts}
        active={active}
        onToggle={toggleType}
        query={query}
        onQuery={setQuery}
        suggestions={suggestions}
        onPick={focusNode}
      />

      {ForceGraph2D && size.w > 0 && (
        <ForceGraph2D
          ref={fgRef as React.MutableRefObject<ForceGraphMethods<FGNode, FGLink> | undefined>}
          graphData={graphData}
          width={size.w}
          height={size.h}
          backgroundColor="rgba(0,0,0,0)"
          nodeId="id"
          nodeRelSize={1}
          nodeVal={(n) => Math.max(1, nodeRadius((n as FGNode).degree) ** 2)}
          nodeCanvasObject={paintNode}
          nodeCanvasObjectMode={() => "replace"}
          nodePointerAreaPaint={paintPointerArea}
          linkColor={linkColor}
          linkWidth={linkWidth}
          onNodeHover={(node) => setHoverId(node ? (node as FGNode).id : null)}
          onNodeClick={(node) => setSelectedId((node as FGNode).id)}
          onBackgroundClick={() => setSelectedId(null)}
          enableNodeDrag
          cooldownTicks={300}
          warmupTicks={120}
          d3AlphaDecay={0.02}
          d3VelocityDecay={0.32}
          onEngineStop={onEngineStop}
        />
      )}

      {/* Hover tooltip */}
      <AnimatePresence>
        {hoverNode && hoverScreenPos && hoverId !== selectedId && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.12 }}
            className="absolute z-10 pointer-events-none"
            style={{
              left: hoverScreenPos.x,
              top: hoverScreenPos.y,
              transform: "translate(14px, -50%)",
            }}
          >
            <div className="rounded-xl bg-background/95 backdrop-blur-xl border border-border/60 shadow-[var(--shadow-lift)] px-3 py-2 min-w-[160px]">
              <div className="flex items-center gap-1.5 mb-1">
                <span
                  className="size-1.5 rounded-full"
                  style={{ background: TYPE_META[hoverNode.type].color }}
                />
                <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  {TYPE_META[hoverNode.type].label}
                </span>
              </div>
              <p className="text-sm font-medium text-foreground leading-tight">{hoverNode.label}</p>
              {hoverNode.sublabel && (
                <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{hoverNode.sublabel}</p>
              )}
              <p className="text-[10px] text-muted-foreground mt-1.5 tabular-nums">
                {hoverNode.degree} connection{hoverNode.degree === 1 ? "" : "s"}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail panel */}
      <AnimatePresence>
        {selectedNode && (
          <GraphDetailPanel
            node={selectedNode}
            neighbors={selectedNeighbors}
            onClose={() => setSelectedId(null)}
            onFocusNode={focusNode}
          />
        )}
      </AnimatePresence>

      {/* Bottom controls */}
      <div className="absolute bottom-4 left-4 flex items-center gap-2 z-10">
        <button
          onClick={recenter}
          className="h-9 px-3 inline-flex items-center gap-1.5 rounded-full bg-background/80 backdrop-blur-xl border border-border/60 text-xs font-medium text-foreground hover:bg-background transition shadow-[var(--shadow-card)]"
        >
          <Crosshair className="size-3.5" strokeWidth={2} />
          Recenter
        </button>
        <button
          onClick={() => setPlain((p) => !p)}
          title={plain ? "Switch to vibey gradient nodes" : "Switch to plain gray nodes"}
          className="h-9 px-3 inline-flex items-center gap-1.5 rounded-full bg-background/80 backdrop-blur-xl border border-border/60 text-xs font-medium text-foreground hover:bg-background transition shadow-[var(--shadow-card)]"
        >
          {plain ? <Sparkles className="size-3.5" strokeWidth={2} /> : <Circle className="size-3.5" strokeWidth={2} />}
          {plain ? "Vibey" : "Plain"}
        </button>
      </div>


      <div className="absolute bottom-4 right-4 z-10 text-[10px] font-mono text-muted-foreground/70 tabular-nums">
        {graphData.nodes.length} nodes · {graphData.links.length} links
      </div>
    </div>
  );
}
