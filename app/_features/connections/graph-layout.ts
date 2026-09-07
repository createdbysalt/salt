import {
  forceCenter,
  forceLink,
  forceManyBody,
  forceSimulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from "d3-force";

/**
 * Force parameters shared by the offline pre-layout below and the live
 * simulation config in ConnectionsGraph. The graph mounts with node
 * positions already at equilibrium for these forces, so the first paint is
 * the final spread — no warmup bloom, no delayed camera zoom-out.
 */
export const GRAPH_FORCES = {
  centerStrength: 0.25,
  chargeStrength: -150,
  chargeDistanceMax: 460,
  linkDistance: 80,
  linkStrength: 0.55,
  alphaDecay: 0.02,
  velocityDecay: 0.32,
  ticks: 300,
} as const;

interface LayoutNode extends SimulationNodeDatum {
  id: string;
}

/**
 * Run the force simulation to completion offscreen and stamp the resulting
 * x/y onto the given node objects (react-force-graph mutates these objects
 * anyway). Links may reference nodes by id or by object.
 */
export function presetGraphLayout<N extends { id: string; x?: number; y?: number }>(
  nodes: N[],
  links: Array<{ source?: string | number | N; target?: string | number | N }>,
): void {
  if (nodes.length === 0) return;

  const ref = (end: string | number | N | undefined): string =>
    typeof end === "object" && end !== null ? end.id : String(end);
  const simNodes: LayoutNode[] = nodes.map((n) => ({ id: n.id }));
  const simLinks: Array<SimulationLinkDatum<LayoutNode>> = links.map((l) => ({
    source: ref(l.source),
    target: ref(l.target),
  }));

  const sim = forceSimulation(simNodes)
    .force("center", forceCenter(0, 0).strength(GRAPH_FORCES.centerStrength))
    .force(
      "charge",
      forceManyBody<LayoutNode>()
        .strength(GRAPH_FORCES.chargeStrength)
        .distanceMax(GRAPH_FORCES.chargeDistanceMax),
    )
    .force(
      "link",
      forceLink<LayoutNode, SimulationLinkDatum<LayoutNode>>(simLinks)
        .id((d) => d.id)
        .distance(GRAPH_FORCES.linkDistance)
        .strength(GRAPH_FORCES.linkStrength),
    )
    .alphaDecay(GRAPH_FORCES.alphaDecay)
    .velocityDecay(GRAPH_FORCES.velocityDecay)
    .stop();

  for (let i = 0; i < GRAPH_FORCES.ticks; i++) sim.tick();

  const positions = new Map(simNodes.map((n) => [n.id, n]));
  for (const node of nodes) {
    const p = positions.get(node.id);
    if (p && p.x != null && p.y != null) {
      node.x = p.x;
      node.y = p.y;
    }
  }
}
