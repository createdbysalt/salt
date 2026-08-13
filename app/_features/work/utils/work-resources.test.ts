import { describe, it, expect } from "vitest";
import type { Resource } from "@/app/_lib/resources/types";
import { splitWorkResources } from "./work-resources";

function makeResource(overrides: Partial<Resource> = {}): Resource {
  return {
    id: overrides.id ?? "res-1",
    workspaceId: "ws-1",
    mode: "static",
    resourceType: "url",
    name: "Resource",
    source: "manual",
    createdAt: "2026-08-01T00:00:00Z",
    updatedAt: "2026-08-01T00:00:00Z",
    ...overrides,
  };
}

describe("splitWorkResources", () => {
  it("returns empty buckets for no resources", () => {
    expect(splitWorkResources([])).toEqual({ contracts: [], other: [] });
  });

  it("puts contract-category resources in contracts", () => {
    const msa = makeResource({ id: "a", fileCategory: "contract", name: "MSA" });
    const sow = makeResource({ id: "b", fileCategory: "contract", name: "SOW" });
    const doc = makeResource({ id: "c", fileCategory: "reference", name: "Copy doc" });

    const { contracts, other } = splitWorkResources([msa, sow, doc]);

    expect(contracts.map((r) => r.id)).toEqual(["a", "b"]);
    expect(other.map((r) => r.id)).toEqual(["c"]);
  });

  it("treats resources without a category as general resources", () => {
    const link = makeResource({ id: "a", resourceType: "github_repo" });

    const { contracts, other } = splitWorkResources([link]);

    expect(contracts).toEqual([]);
    expect(other.map((r) => r.id)).toEqual(["a"]);
  });

  it("does not treat other categories as contracts", () => {
    const proposal = makeResource({ id: "a", fileCategory: "proposal" });
    const deliverable = makeResource({ id: "b", fileCategory: "deliverable" });

    const { contracts, other } = splitWorkResources([proposal, deliverable]);

    expect(contracts).toEqual([]);
    expect(other).toHaveLength(2);
  });

  it("preserves input order within each bucket", () => {
    const a = makeResource({ id: "a", fileCategory: "contract" });
    const b = makeResource({ id: "b" });
    const c = makeResource({ id: "c", fileCategory: "contract" });
    const d = makeResource({ id: "d" });

    const { contracts, other } = splitWorkResources([a, b, c, d]);

    expect(contracts.map((r) => r.id)).toEqual(["a", "c"]);
    expect(other.map((r) => r.id)).toEqual(["b", "d"]);
  });
});
