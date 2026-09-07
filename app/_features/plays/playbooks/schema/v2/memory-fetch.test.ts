import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const { fromMock, personMaybeSingle, meetingsHead, blockersQuery } = vi.hoisted(
  () => {
    const personMaybeSingle = vi.fn();
    const meetingsHead = vi.fn();
    const blockersLimit = vi.fn();
    const blockersQuery = {
      eq: vi.fn(),
      order: vi.fn(),
      limit: blockersLimit,
    };
    const fromMock = vi.fn();
    return { fromMock, personMaybeSingle, meetingsHead, blockersQuery };
  }
);

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: fromMock }),
}));

import {
  fetchMemorySource,
  isMemoryFetchCategory,
} from "./memory-fetch";

describe("memory-fetch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("recognizes the memory category", () => {
    expect(isMemoryFetchCategory("memory")).toBe(true);
    expect(isMemoryFetchCategory("billing")).toBe(false);
  });

  it("rejects unknown capabilities", async () => {
    await expect(
      fetchMemorySource("ws-1", "nonsense", undefined, {})
    ).rejects.toThrow('Unknown memory capability "nonsense"');
  });

  describe("person_context", () => {
    function mockPersonQuery(person: Record<string, unknown> | null) {
      personMaybeSingle.mockResolvedValue({ data: person, error: null });
      fromMock.mockImplementation((table: string) => {
        if (table === "people") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  is: () => ({ maybeSingle: personMaybeSingle }),
                }),
              }),
            }),
          };
        }
        if (table === "meetings") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  is: () => ({ limit: meetingsHead }),
                }),
              }),
            }),
          };
        }
        throw new Error(`unexpected table ${table}`);
      });
    }

    it("returns a single context object for the triggered person", async () => {
      mockPersonQuery({
        id: "p-1",
        name: "Sarah",
        email: "sarah@acme.com",
        relationship_type: "client",
        relationship_status: "active",
        last_contact_at: "2026-07-01T00:00:00Z",
        first_contact_at: "2026-01-01T00:00:00Z",
        notes: "Likes async updates",
        relationship_health_band: "cooling",
        relationship_health_score: 55,
      });
      meetingsHead.mockResolvedValue({ count: 2 });

      const result = (await fetchMemorySource("ws-1", "person_context", undefined, {
        entityId: "p-1",
        entitySurface: "person",
      })) as Record<string, unknown>;

      expect(result.name).toBe("Sarah");
      expect(result.relationship_type).toBe("client");
      expect(result.recent_notes).toBe("Likes async updates");
      expect(result.has_calendar_meeting).toBe(true);
    });

    it("throws without a person entity in the trigger context", async () => {
      await expect(
        fetchMemorySource("ws-1", "person_context", undefined, {})
      ).rejects.toThrow("requires a person entity");
    });

    it("throws when the person is not in the workspace", async () => {
      mockPersonQuery(null);
      meetingsHead.mockResolvedValue({ count: 0 });

      await expect(
        fetchMemorySource("ws-1", "person_context", undefined, {
          entityId: "p-404",
          entitySurface: "person",
        })
      ).rejects.toThrow("not found");
    });
  });

  describe("silent_relationships", () => {
    it("returns people past the contact window with days computed", async () => {
      const thirtyOneDaysAgo = new Date(
        Date.now() - 31 * 24 * 60 * 60 * 1000
      ).toISOString();

      const limitMock = vi.fn().mockResolvedValue({
        data: [
          {
            id: "p-1",
            name: "Quiet Client",
            relationship_type: "client",
            last_contact_at: thirtyOneDaysAgo,
          },
        ],
        error: null,
      });

      fromMock.mockImplementation((table: string) => {
        if (table !== "people") throw new Error(`unexpected table ${table}`);
        return {
          select: () => ({
            eq: () => ({
              lt: () => ({
                is: () => ({
                  is: () => ({
                    order: () => ({ limit: limitMock }),
                  }),
                }),
              }),
            }),
          }),
        };
      });

      const result = (await fetchMemorySource(
        "ws-1",
        "silent_relationships",
        { days_since_contact: 30 },
        {}
      )) as Array<Record<string, unknown>>;

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Quiet Client");
      expect(result[0].days_since_contact).toBe(31);
    });
  });

  describe("work_blocked", () => {
    function mockBlockers(rows: unknown[]) {
      const chain = {
        eq: vi.fn(),
        is: vi.fn(),
        order: vi.fn(),
        limit: vi.fn(),
      };
      chain.eq.mockReturnValue(chain);
      chain.is.mockReturnValue(chain);
      chain.order.mockReturnValue(chain);
      chain.limit.mockResolvedValue({ data: rows, error: null });
      fromMock.mockImplementation((table: string) => {
        if (table !== "work_blockers") {
          throw new Error(`unexpected table ${table}`);
        }
        return { select: () => chain };
      });
    }

    it("returns a single object when scoped to a work entity", async () => {
      mockBlockers([
        {
          work_id: "w-1",
          title: "Waiting on assets",
          blocker_type: "client_dependency",
          detail: "Client owes brand assets",
          detected_at: "2026-08-01T00:00:00Z",
          work: { title: "Website redesign" },
        },
      ]);

      const result = (await fetchMemorySource("ws-1", "work_blocked", undefined, {
        entityId: "w-1",
        entitySurface: "work",
      })) as Record<string, unknown>;

      expect(result.name).toBe("Website redesign");
      expect(result.blocker_reason).toBe("Client owes brand assets");
    });

    it("throws when the signaled work has no unresolved blocker", async () => {
      mockBlockers([]);

      await expect(
        fetchMemorySource("ws-1", "work_blocked", undefined, {
          entityId: "w-9",
          entitySurface: "work",
        })
      ).rejects.toThrow("no unresolved blocker");
    });
  });

  describe("billing_record_context", () => {
    function mockBillingQueries(input: {
      record: Record<string, unknown> | null;
      person?: Record<string, unknown> | null;
      history?: unknown[];
    }) {
      const recordMaybeSingle = vi
        .fn()
        .mockResolvedValue({ data: input.record, error: null });
      const personMaybeSingle = vi
        .fn()
        .mockResolvedValue({ data: input.person ?? null, error: null });
      let billingCall = 0;
      fromMock.mockImplementation((table: string) => {
        if (table === "billing_records") {
          billingCall++;
          if (billingCall === 1) {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({ maybeSingle: recordMaybeSingle }),
                }),
              }),
            };
          }
          // History query: select → eq(workspace) → eq(direction) → eq(person) awaited
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  eq: vi.fn().mockResolvedValue({
                    data: input.history ?? [],
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "people") {
          return {
            select: () => ({
              eq: () => ({ maybeSingle: personMaybeSingle }),
            }),
          };
        }
        throw new Error(`unexpected table ${table}`);
      });
    }

    const overdueRecord = {
      id: "br-1",
      number: "INV-104",
      status: "overdue",
      amount_cents: 200000,
      amount_paid_cents: 50000,
      currency: "usd",
      due_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      person_id: "p-1",
      organization_id: null,
      app_url: "https://invoice.stripe.com/i/acct_test/in_104",
    };

    it("returns invoice, client, payment history, and open invoices", async () => {
      mockBillingQueries({
        record: overdueRecord,
        person: { id: "p-1", name: "Dana", email: "dana@acme.com" },
        history: [
          {
            id: "br-1",
            number: "INV-104",
            status: "overdue",
            amount_cents: 200000,
            amount_paid_cents: 50000,
            due_at: overdueRecord.due_at,
            paid_at: null,
            app_url: "https://invoice.stripe.com/i/acct_test/in_104",
          },
          {
            id: "br-0",
            number: "INV-100",
            status: "paid",
            amount_cents: 100000,
            amount_paid_cents: 100000,
            due_at: "2026-06-01T00:00:00Z",
            paid_at: "2026-05-30T00:00:00Z", // paid before due → on time
          },
          {
            id: "br-2",
            number: "INV-102",
            status: "paid",
            amount_cents: 80000,
            amount_paid_cents: 80000,
            due_at: "2026-07-01T00:00:00Z",
            paid_at: "2026-07-15T00:00:00Z", // paid after due → late
          },
        ],
      });

      const result = (await fetchMemorySource(
        "ws-1",
        "billing_record_context",
        undefined,
        { entityId: "br-1", entitySurface: "billing" }
      )) as {
        invoice: Record<string, unknown>;
        client: Record<string, unknown>;
        payment_history: { on_time: number; late: number };
        open_invoices: Array<Record<string, unknown>>;
      };

      expect(result.invoice.number).toBe("INV-104");
      expect(result.invoice.amount_remaining_cents).toBe(150000);
      expect(result.invoice.days_overdue).toBe(10);
      expect(result.invoice.pay_url).toBe(
        "https://invoice.stripe.com/i/acct_test/in_104"
      );
      expect(result.client).toMatchObject({
        name: "Dana",
        email: "dana@acme.com",
        kind: "person",
      });
      expect(result.payment_history).toEqual({ on_time: 1, late: 1 });
      // Only the overdue invoice is open; paid ones are excluded.
      expect(result.open_invoices).toHaveLength(1);
      expect(result.open_invoices[0]).toMatchObject({
        number: "INV-104",
        amount_remaining_cents: 150000,
        pay_url: "https://invoice.stripe.com/i/acct_test/in_104",
      });
    });

    it("throws without a billing entity in the trigger context", async () => {
      await expect(
        fetchMemorySource("ws-1", "billing_record_context", undefined, {})
      ).rejects.toThrow("requires a billing entity");
    });

    it("throws when the record is not in the workspace", async () => {
      mockBillingQueries({ record: null });

      await expect(
        fetchMemorySource("ws-1", "billing_record_context", undefined, {
          entityId: "br-404",
          entitySurface: "billing",
        })
      ).rejects.toThrow("not found");
    });
  });

  describe("file_context", () => {
    function mockFileQueries(input: {
      file: Record<string, unknown> | null;
      person?: Record<string, unknown> | null;
      org?: Record<string, unknown> | null;
    }) {
      const fileMaybeSingle = vi
        .fn()
        .mockResolvedValue({ data: input.file, error: null });
      const personMaybeSingle = vi
        .fn()
        .mockResolvedValue({ data: input.person ?? null, error: null });
      const orgMaybeSingle = vi
        .fn()
        .mockResolvedValue({ data: input.org ?? null, error: null });
      fromMock.mockImplementation((table: string) => {
        if (table === "resources") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  is: () => ({ maybeSingle: fileMaybeSingle }),
                }),
              }),
            }),
          };
        }
        if (table === "people") {
          return {
            select: () => ({
              eq: () => ({ maybeSingle: personMaybeSingle }),
            }),
          };
        }
        if (table === "organizations") {
          return {
            select: () => ({
              eq: () => ({ maybeSingle: orgMaybeSingle }),
            }),
          };
        }
        throw new Error(`unexpected table ${table}`);
      });
    }

    const contractFile = {
      id: "f-1",
      file_name: "Acme MSA 2026.pdf",
      category: "contract",
      document_type: "msa",
      description: "Master services agreement with Acme",
      ai_summary: "MSA between the operator and Acme Corp, net-30, 12-month term",
      external_url: "https://drive.google.com/file/d/abc",
      provider: "google_drive",
      signed_date: null,
      person_id: "p-1",
      organization_id: "o-1",
    };

    it("returns the file with counterparty person and org", async () => {
      mockFileQueries({
        file: contractFile,
        person: { id: "p-1", name: "Dana", email: "dana@acme.com" },
        org: { id: "o-1", name: "Acme Corp" },
      });

      const result = (await fetchMemorySource(
        "ws-1",
        "file_context",
        undefined,
        { entityId: "f-1", entitySurface: "resource" }
      )) as Record<string, unknown>;

      expect(result.file_name).toBe("Acme MSA 2026.pdf");
      expect(result.category).toBe("contract");
      expect(result.document_type).toBe("msa");
      expect(result.provider).toBe("google_drive");
      expect(result.counterparty).toMatchObject({
        name: "Dana",
        email: "dana@acme.com",
      });
      expect(result.counterparty_org).toMatchObject({ name: "Acme Corp" });
    });

    it("returns null counterparties for an unlinked file", async () => {
      mockFileQueries({
        file: { ...contractFile, person_id: null, organization_id: null },
      });

      const result = (await fetchMemorySource(
        "ws-1",
        "file_context",
        undefined,
        { entityId: "f-1", entitySurface: "resource" }
      )) as Record<string, unknown>;

      expect(result.counterparty).toBeNull();
      expect(result.counterparty_org).toBeNull();
    });

    it("throws without a resource entity in the trigger context", async () => {
      await expect(
        fetchMemorySource("ws-1", "file_context", undefined, {})
      ).rejects.toThrow("requires a resource entity");
    });

    it("throws when the file is not in the workspace", async () => {
      mockFileQueries({ file: null });

      await expect(
        fetchMemorySource("ws-1", "file_context", undefined, {
          entityId: "f-404",
          entitySurface: "resource",
        })
      ).rejects.toThrow("not found");
    });
  });
});
