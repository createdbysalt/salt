/**
 * Cross-app corroboration counter (registry-wiring Phase 4): counts the
 * distinct connector categories with capture evidence for an email. The
 * records-engine admission bonus (corroborationCount >= 2) reads this.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const createAdminClientMock = vi.fn();
vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: () => createAdminClientMock(),
}));

import { countCorroboratingCategories } from "./corroboration";

/** Admin-client stub: responds with a row only for the listed source types. */
function stubAdmin(respondingSourceTypes: string[]) {
  createAdminClientMock.mockReturnValue({
    from: () => {
      const state: { sourceTypes?: string[] } = {};
      const chain = {
        select: () => chain,
        eq: () => chain,
        in: (_column: string, values: string[]) => {
          state.sourceTypes = values;
          return chain;
        },
        contains: () => chain,
        limit: () => chain,
        maybeSingle: async () => ({
          data: state.sourceTypes?.some((type) =>
            respondingSourceTypes.includes(type),
          )
            ? { id: "capture-1" }
            : null,
          error: null,
        }),
      };
      return chain;
    },
  });
}

describe("countCorroboratingCategories", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("counts distinct categories with capture evidence", async () => {
    // stripe → billing, gmail → email: two categories corroborate.
    stubAdmin(["stripe", "gmail"]);

    const count = await countCorroboratingCategories("ws-1", "jane@acme.com");

    expect(count).toBe(2);
  });

  it("does not double-count two sources in the same category", async () => {
    // stripe + quickbooks are both billing — one category.
    stubAdmin(["stripe", "quickbooks"]);

    const count = await countCorroboratingCategories("ws-1", "jane@acme.com");

    expect(count).toBe(1);
  });

  it("returns 0 when no category has evidence", async () => {
    stubAdmin([]);

    const count = await countCorroboratingCategories("ws-1", "jane@acme.com");

    expect(count).toBe(0);
  });
});
