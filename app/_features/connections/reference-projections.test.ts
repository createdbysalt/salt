/**
 * Reference-field connection parity — behavioral half (Phase 3 of
 * .cursor/plans/2026-08-10-registry-wiring-record-sourcing.md).
 *
 * A reference field IS a connection: it projects into the Memory Map graph
 * and into BOTH records' connection queries at read time, never duplicated
 * into entity_links. These tests prove the projections declared in
 * ./reference-projections.ts actually happen in ./queries.ts:
 *
 * - work.billingContactId  → graph edge + work→person + person→work
 * - org.primaryContact     → org→people (junction) + person→org
 * - billing.organization / billingContact / linkedWork → billing→org/person/work
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getConnectionsGraphData,
  getEntityConnections,
} from "@/app/_features/connections/queries";

const WORKSPACE_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const PERSON_ID = "11111111-1111-1111-1111-111111111111";
const ORG_ID = "22222222-2222-2222-2222-222222222222";
const WORK_ID = "44444444-4444-4444-4444-444444444444";
const BILLING_ID = "55555555-5555-5555-5555-555555555555";

const personRow = { id: PERSON_ID, name: "Jane Doe", title: "Founder" };
const orgRow = { id: ORG_ID, name: "Acme Co", industry: "SaaS" };
const workRow = { id: WORK_ID, name: "Brand Refresh", status: "active" };

interface RecordedCall {
  method: string;
  args: unknown[];
}

interface QueryResult {
  data: unknown;
  error: null;
}

type Router = (table: string, calls: RecordedCall[]) => QueryResult;

function called(
  calls: RecordedCall[],
  method: string,
  firstArg?: string
): boolean {
  return calls.some(
    (call) =>
      call.method === method &&
      (firstArg === undefined || call.args[0] === firstArg)
  );
}

/**
 * Chainable supabase mock: every method records the call and returns the
 * chain; awaiting the chain (any terminal) resolves the router's result.
 */
function createMockClient(router: Router) {
  return {
    from(table: string) {
      const calls: RecordedCall[] = [];
      const finish = (): Promise<QueryResult> =>
        Promise.resolve(router(table, calls));
      const chain: object = new Proxy(
        {},
        {
          get(_target, prop: string | symbol) {
            if (prop === "then") {
              return (
                onFulfilled?: ((value: QueryResult) => unknown) | null,
                onRejected?: ((reason: unknown) => unknown) | null
              ) => finish().then(onFulfilled, onRejected);
            }
            if (prop === "maybeSingle" || prop === "single") {
              return () =>
                finish().then((result) => ({
                  data: Array.isArray(result.data)
                    ? (result.data[0] ?? null)
                    : (result.data ?? null),
                  error: result.error,
                }));
            }
            return (...args: unknown[]) => {
              calls.push({ method: String(prop), args });
              return chain;
            };
          },
        }
      );
      return chain;
    },
  };
}

function mockClient(router: Router): void {
  vi.mocked(createClient).mockResolvedValueOnce(
    createMockClient(router) as unknown as Awaited<
      ReturnType<typeof createClient>
    >
  );
}

const empty = { data: [], error: null } as const;

vi.mock("@/app/_lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@/app/_lib/supabase/server";

describe("reference-field projections", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("graph projection", () => {
    it("projects work.billing_contact_id as a work → person edge", async () => {
      mockClient((table) => {
        if (table === "people") return { data: [personRow], error: null };
        if (table === "work") {
          return {
            data: [{ ...workRow, organization_id: null, person_id: null, billing_contact_id: PERSON_ID }],
            error: null,
          };
        }
        return empty;
      });

      const graph = await getConnectionsGraphData(WORKSPACE_ID);

      expect(graph.edges).toContainEqual({
        source: `work:${WORK_ID}`,
        target: `person:${PERSON_ID}`,
        edgeType: "structural",
      });
    });
  });

  describe("getEntityConnections", () => {
    it("work connections include the billing-contact person", async () => {
      mockClient((table, calls) => {
        if (table === "work" && called(calls, "eq", "id")) {
          return {
            data: { organization_id: null, billing_contact_id: PERSON_ID },
            error: null,
          };
        }
        if (table === "people" && called(calls, "in", "id")) {
          return { data: [personRow], error: null };
        }
        return empty;
      });

      const connections = await getEntityConnections(
        WORKSPACE_ID,
        "work",
        WORK_ID
      );

      expect(connections).toContainEqual(
        expect.objectContaining({
          id: `person:${PERSON_ID}`,
          nodeType: "person",
          label: "Jane Doe",
        })
      );
    });

    it("person connections include work items they are billing contact for", async () => {
      mockClient((table, calls) => {
        if (table === "work" && called(calls, "eq", "billing_contact_id")) {
          return { data: [workRow], error: null };
        }
        return empty;
      });

      const connections = await getEntityConnections(
        WORKSPACE_ID,
        "person",
        PERSON_ID
      );

      expect(connections).toContainEqual(
        expect.objectContaining({
          id: `work:${WORK_ID}`,
          nodeType: "work",
          label: "Brand Refresh",
        })
      );
    });

    it("org connections include people linked via the junction", async () => {
      mockClient((table, calls) => {
        if (
          table === "organization_people" &&
          called(calls, "eq", "organization_id")
        ) {
          return { data: [{ person_id: PERSON_ID }], error: null };
        }
        if (table === "people" && called(calls, "in", "id")) {
          return { data: [personRow], error: null };
        }
        return empty;
      });

      const connections = await getEntityConnections(
        WORKSPACE_ID,
        "org",
        ORG_ID
      );

      expect(connections).toContainEqual(
        expect.objectContaining({
          id: `person:${PERSON_ID}`,
          nodeType: "person",
          label: "Jane Doe",
        })
      );
    });

    it("billing connections include counterparty org, person, and work", async () => {
      mockClient((table, calls) => {
        if (table === "billing_records" && called(calls, "eq", "id")) {
          return {
            data: {
              organization_id: ORG_ID,
              person_id: PERSON_ID,
              work_id: WORK_ID,
            },
            error: null,
          };
        }
        if (table === "organizations" && called(calls, "in", "id")) {
          return { data: [orgRow], error: null };
        }
        if (table === "people" && called(calls, "in", "id")) {
          return { data: [personRow], error: null };
        }
        if (table === "work" && called(calls, "in", "id")) {
          return { data: [workRow], error: null };
        }
        return empty;
      });

      const connections = await getEntityConnections(
        WORKSPACE_ID,
        "billing",
        BILLING_ID
      );

      expect(connections).toContainEqual(
        expect.objectContaining({ id: `org:${ORG_ID}`, nodeType: "org" })
      );
      expect(connections).toContainEqual(
        expect.objectContaining({ id: `person:${PERSON_ID}`, nodeType: "person" })
      );
      expect(connections).toContainEqual(
        expect.objectContaining({ id: `work:${WORK_ID}`, nodeType: "work" })
      );
    });
  });
});
