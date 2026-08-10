import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

let rows: Array<{ id: string }> = [];
let queryError: { message: string } | null = null;
const filters: Record<string, unknown> = {};

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table !== "capture_events") throw new Error(`unexpected table ${table}`);
      return {
        select: () => ({
          eq: (col: string, value: unknown) => {
            filters[col] = value;
            return {
              eq: (col2: string, value2: unknown) => {
                filters[col2] = value2;
                return {
                  eq: (col3: string, value3: unknown) => {
                    filters[col3] = value3;
                    return {
                      limit: () =>
                        Promise.resolve({ data: rows, error: queryError }),
                    };
                  },
                };
              },
            };
          },
        }),
      };
    },
  }),
}));

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { captureAlreadyIngested } from "./pre-enrichment-gates";

beforeEach(() => {
  rows = [];
  queryError = null;
  for (const key of Object.keys(filters)) delete filters[key];
});

describe("captureAlreadyIngested", () => {
  it("returns true when a capture row already holds the external id", async () => {
    rows = [{ id: "cap-1" }];

    const admin = createAdminClient();
    await expect(
      captureAlreadyIngested(admin, "ws-1", "outlook", "msg-1"),
    ).resolves.toBe(true);

    expect(filters).toEqual({
      workspace_id: "ws-1",
      source_type: "outlook",
      source_external_id: "msg-1",
    });
  });

  it("returns false when the message has not been ingested", async () => {
    const admin = createAdminClient();
    await expect(
      captureAlreadyIngested(admin, "ws-1", "outlook", "msg-new"),
    ).resolves.toBe(false);
  });

  it("fails open when the query errors — the unique constraint is the real guard", async () => {
    queryError = { message: "db down" };

    const admin = createAdminClient();
    await expect(
      captureAlreadyIngested(admin, "ws-1", "outlook", "msg-1"),
    ).resolves.toBe(false);
  });
});
