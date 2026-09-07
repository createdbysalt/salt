import { describe, expect, it } from "vitest";

import { presetGraphLayout } from "./graph-layout";

type TestNode = { id: string; x?: number; y?: number };

describe("presetGraphLayout", () => {
  it("assigns finite positions to every node", () => {
    const nodes: TestNode[] = [{ id: "a" }, { id: "b" }, { id: "c" }];
    const links = [
      { source: "a", target: "b" },
      { source: "b", target: "c" },
    ];

    presetGraphLayout(nodes, links);

    for (const node of nodes) {
      expect(Number.isFinite(node.x)).toBe(true);
      expect(Number.isFinite(node.y)).toBe(true);
    }
  });

  it("spreads nodes out (non-degenerate bounding box)", () => {
    const nodes: TestNode[] = Array.from({ length: 12 }, (_, i) => ({ id: `n${i}` }));
    const links = Array.from({ length: 11 }, (_, i) => ({
      source: `n${i}`,
      target: `n${i + 1}`,
    }));

    presetGraphLayout(nodes, links);

    const xs = nodes.map((n) => n.x!);
    const ys = nodes.map((n) => n.y!);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(50);
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(50);
  });

  it("keeps linked nodes closer than unlinked ones", () => {
    const nodes: TestNode[] = [{ id: "a" }, { id: "b" }, { id: "far" }];
    const links = [{ source: "a", target: "b" }];

    presetGraphLayout(nodes, links);

    const [a, b, far] = nodes;
    const linked = Math.hypot(a.x! - b.x!, a.y! - b.y!);
    const unlinked = Math.min(
      Math.hypot(a.x! - far.x!, a.y! - far.y!),
      Math.hypot(b.x! - far.x!, b.y! - far.y!),
    );
    expect(linked).toBeLessThan(unlinked);
  });

  it("is a no-op for an empty graph", () => {
    expect(() => presetGraphLayout([], [])).not.toThrow();
  });
});
