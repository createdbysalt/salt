import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Batch cold-intent discovery over held mail (Sync & Scan entry point).
 *
 * The real-time Lane 1 read (gates/cold-intent.ts) only fires on mail that
 * ARRIVES on the webhook path. Mail that was held before that lane existed —
 * or while spend was refused — sits frozen. This pass pays the same cheap,
 * metered intent read for held senders the free DB criteria can't promote.
 */

interface HeldRowFixture {
  id: string;
  created_at: string;
  extracted_data: Record<string, unknown> | null;
}

const h = vi.hoisted(() => {
  const state = {
    heldRows: [] as HeldRowFixture[],
    released: [] as string[],
    operatorEmails: new Set<string>(["hello@createdbysalt.com"]),
  };
  return state;
});

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table !== "capture_events") throw new Error(`unexpected table ${table}`);
      const builder = {
        select: () => builder,
        eq: () => builder,
        gte: () => builder,
        order: () => builder,
        limit: async () => ({ data: h.heldRows, error: null }),
        update: () => ({
          in: (_column: string, ids: string[]) => {
            h.released.push(...ids);
            return Promise.resolve({ error: null });
          },
        }),
      };
      return builder;
    },
  }),
}));

const classifyMock = vi.fn();
vi.mock("./gates/cold-intent", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("./gates/cold-intent")>();
  return {
    ...actual,
    classifyColdInboundIntent: (...args: unknown[]) => classifyMock(...args),
  };
});

const resolvePersonMock = vi.fn();
vi.mock("@/app/_features/memory/records/person-resolver", () => ({
  resolvePerson: (...args: unknown[]) => resolvePersonMock(...args),
}));

vi.mock("@/app/_lib/identity/operator", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/app/_lib/identity/operator")>();
  return {
    ...actual,
    getOperatorIdentity: vi.fn(async () => ({
      emails: h.operatorEmails,
      names: new Set<string>(),
      domains: new Set<string>(),
    })),
  };
});

import { runHeldIntentDiscovery } from "./held-intent-discovery";

function heldRow(
  id: string,
  senderEmail: string,
  subject: string,
  createdAt: string,
  senderName: string | null = null,
): HeldRowFixture {
  return {
    id,
    created_at: createdAt,
    extracted_data: {
      sender_email: senderEmail,
      sender_name: senderName,
      subject,
    },
  };
}

const GENUINE = {
  checked: true,
  genuineInquiry: true,
  confidence: 0.9,
  reason: "Asks about booking a shoot",
};

const NOT_GENUINE = {
  checked: true,
  genuineInquiry: false,
  confidence: 0.9,
  reason: "Mass outreach",
};

beforeEach(() => {
  h.heldRows = [];
  h.released = [];
  classifyMock.mockReset().mockResolvedValue(NOT_GENUINE);
  resolvePersonMock.mockReset().mockResolvedValue({
    resolved: true,
    person_id: "person-new-1",
    is_new: true,
  });
});

describe("runHeldIntentDiscovery", () => {
  it("promotes a held sender whose latest message reads as a genuine inquiry", async () => {
    h.heldRows = [
      heldRow("cap-1", "anna@acme.com", "Are you free June 14?", "2026-08-26T10:00:00Z", "Anna"),
    ];
    classifyMock.mockResolvedValue(GENUINE);

    const result = await runHeldIntentDiscovery("ws-1");

    expect(classifyMock).toHaveBeenCalledTimes(1);
    expect(classifyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: "ws-1",
        senderEmail: "anna@acme.com",
        senderName: "Anna",
        subject: "Are you free June 14?",
      }),
    );
    expect(resolvePersonMock).toHaveBeenCalledWith(
      "ws-1",
      expect.objectContaining({ email: "anna@acme.com", name: "Anna" }),
    );
    expect(h.released).toEqual(["cap-1"]);
    expect(result.promoted).toBe(1);
    expect(result.releasedCaptures).toBe(1);
  });

  it("keeps the sender held when the read says not genuine", async () => {
    h.heldRows = [heldRow("cap-1", "sales@spammy.com", "Quick question", "2026-08-26T10:00:00Z")];
    classifyMock.mockResolvedValue(NOT_GENUINE);

    const result = await runHeldIntentDiscovery("ws-1");

    expect(result.promoted).toBe(0);
    expect(resolvePersonMock).not.toHaveBeenCalled();
    expect(h.released).toEqual([]);
    expect(result.reads).toBe(1);
  });

  it("never pays for a read on the operator's own email", async () => {
    h.heldRows = [
      heldRow("cap-1", "hello@createdbysalt.com", "Test to myself", "2026-08-26T10:00:00Z"),
    ];

    const result = await runHeldIntentDiscovery("ws-1");

    expect(classifyMock).not.toHaveBeenCalled();
    expect(result.promoted).toBe(0);
  });

  it("skips senders the free DB criteria will promote (volume-qualified)", async () => {
    h.heldRows = [
      heldRow("cap-1", "regular@client.com", "One", "2026-08-24T10:00:00Z"),
      heldRow("cap-2", "regular@client.com", "Two", "2026-08-25T10:00:00Z"),
      heldRow("cap-3", "regular@client.com", "Three", "2026-08-26T10:00:00Z"),
    ];

    const result = await runHeldIntentDiscovery("ws-1");

    // 3 messages over 3 distinct days — the cron's free pass promotes them.
    expect(classifyMock).not.toHaveBeenCalled();
    expect(result.skippedFreeCriteria).toBe(1);
  });

  it("is fail-neutral: a read failure is recorded, never thrown", async () => {
    h.heldRows = [heldRow("cap-1", "anna@acme.com", "Booking?", "2026-08-26T10:00:00Z")];
    classifyMock.mockRejectedValue(new Error("llm down"));

    const result = await runHeldIntentDiscovery("ws-1");

    expect(result.promoted).toBe(0);
    expect(result.errors).toHaveLength(1);
  });

  it("bounds the number of paid reads per run", async () => {
    h.heldRows = Array.from({ length: 15 }, (_, i) =>
      heldRow(`cap-${i}`, `sender${i}@x.com`, `Subject ${i}`, "2026-08-26T10:00:00Z"),
    );

    const result = await runHeldIntentDiscovery("ws-1", { maxSenders: 5 });

    expect(classifyMock).toHaveBeenCalledTimes(5);
    expect(result.reads).toBe(5);
  });

  it("skips senders with no subject — nothing to judge", async () => {
    h.heldRows = [
      {
        id: "cap-1",
        created_at: "2026-08-26T10:00:00Z",
        extracted_data: { sender_email: "anna@acme.com" },
      },
    ];

    const result = await runHeldIntentDiscovery("ws-1");

    expect(classifyMock).not.toHaveBeenCalled();
    expect(result.promoted).toBe(0);
  });
});
