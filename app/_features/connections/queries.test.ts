import { describe, it, expect, vi, beforeEach } from "vitest";
import { getConnectionsGraphData } from "@/app/_features/connections/queries";

const WORKSPACE_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const PERSON_ID = "11111111-1111-1111-1111-111111111111";
const ORG_ID = "22222222-2222-2222-2222-222222222222";
const NOTE_ID = "33333333-3333-3333-3333-333333333333";

const mockPeople = [
  { id: PERSON_ID, name: "Jane Doe", title: "Founder" },
];

const mockOrgs = [{ id: ORG_ID, name: "Acme Co", industry: "SaaS" }];

const mockOrgLinks = [{ person_id: PERSON_ID, organization_id: ORG_ID }];

const mockNotes = [
  {
    id: NOTE_ID,
    title: "Meeting notes",
    content: "Follow up with [[Jane Doe]] about the proposal.",
  },
];

const mockEntityLinks = [
  {
    source_type: "note",
    source_id: NOTE_ID,
    target_type: "person",
    target_id: PERSON_ID,
    relation_type: "mention",
  },
];

function createChainableQuery(
  result: { data: unknown; error?: null },
  terminal: "is" | "limit" | "in" | "eq" = "is",
) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
  };

  if (terminal === "is") {
    chain.is.mockResolvedValue(result);
  } else if (terminal === "limit") {
    chain.limit.mockResolvedValue(result);
  } else if (terminal === "eq") {
    chain.eq.mockResolvedValue(result);
  } else {
    chain.in.mockResolvedValue(result);
  }

  return chain;
}

function mockGraphTable(table: string) {
  if (table === "people") {
    return createChainableQuery({ data: mockPeople, error: null }, "limit");
  }
  if (table === "organizations") {
    return createChainableQuery({ data: mockOrgs, error: null }, "limit");
  }
  if (table === "work") {
    return createChainableQuery({ data: [], error: null }, "limit");
  }
  if (table === "notes") {
    return createChainableQuery({ data: mockNotes, error: null }, "limit");
  }
  if (table === "billing_records") {
    return createChainableQuery({ data: [], error: null }, "limit");
  }
  if (table === "files") {
    return createChainableQuery({ data: [], error: null }, "limit");
  }
  if (table === "meetings") {
    return createChainableQuery({ data: [], error: null }, "limit");
  }
  if (table === "organization_people") {
    return createChainableQuery({ data: mockOrgLinks, error: null }, "in");
  }
  if (table === "entity_links") {
    return createChainableQuery({ data: mockEntityLinks, error: null }, "eq");
  }
  return createChainableQuery({ data: [], error: null }, "is");
}

vi.mock("@/app/_lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      from: vi.fn((table: string) => mockGraphTable(table)),
    }),
  ),
}));

describe("getConnectionsGraphData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("builds person and org nodes with a junction edge", async () => {
    const graph = await getConnectionsGraphData(WORKSPACE_ID);

    const personNode = graph.nodes.find((n) => n.type === "person");
    const orgNode = graph.nodes.find((n) => n.type === "org");

    expect(personNode).toMatchObject({
      id: `person:${PERSON_ID}`,
      label: "Jane Doe",
      sublabel: "Founder",
      href: `/people/${PERSON_ID}`,
    });
    expect(orgNode).toMatchObject({
      id: `org:${ORG_ID}`,
      label: "Acme Co",
      sublabel: "SaaS",
      href: `/orgs/${ORG_ID}`,
    });

    expect(graph.edges).toContainEqual({
      source: `person:${PERSON_ID}`,
      target: `org:${ORG_ID}`,
      edgeType: "employment",
    });
  });

  it("resolves note mention links to person nodes", async () => {
    const graph = await getConnectionsGraphData(WORKSPACE_ID);

    const noteNode = graph.nodes.find((n) => n.type === "note");
    expect(noteNode).toMatchObject({
      id: `note:${NOTE_ID}`,
      label: "Meeting notes",
      type: "note",
    });

    expect(graph.edges).toContainEqual({
      source: `note:${NOTE_ID}`,
      target: `person:${PERSON_ID}`,
      edgeType: "mention",
    });
  });

  it("returns an empty graph when no entities exist", async () => {
    const { createClient } = await import("@/app/_lib/supabase/server");
    vi.mocked(createClient).mockResolvedValueOnce({
      from: vi.fn((table: string) => {
        if (table === "organization_people") {
          return createChainableQuery({ data: [], error: null }, "in");
        }
        if (
          table === "people" ||
          table === "organizations" ||
          table === "work" ||
          table === "notes" ||
          table === "billing_records" ||
          table === "files" ||
          table === "meetings"
        ) {
          return createChainableQuery({ data: [], error: null }, "limit");
        }
        if (table === "entity_links") {
          return createChainableQuery({ data: [], error: null }, "eq");
        }
        return createChainableQuery({ data: [], error: null }, "is");
      }),
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    const graph = await getConnectionsGraphData(WORKSPACE_ID);

    expect(graph.nodes).toEqual([]);
    expect(graph.edges).toEqual([]);
  });
});
