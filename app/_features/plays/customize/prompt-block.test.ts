import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const tableResults: Record<string, { data: unknown; error: unknown }> = {};

function chainFor(table: string) {
  const terminal = () =>
    Promise.resolve(tableResults[table] ?? { data: null, error: null });
  const chain: Record<string, unknown> = new Proxy(
    {},
    {
      get(_, prop) {
        if (prop === "then") return undefined;
        if (prop === "single" || prop === "maybeSingle") return terminal;
        // Terminal for chained queries awaiting the builder itself.
        if (prop === "limit") return () => terminal();
        return () => chain;
      },
    }
  ) as Record<string, unknown>;
  return chain;
}

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn((table: string) => ({
      select: vi.fn(() => chainFor(table)),
    })),
  })),
}));

import { buildPlaybookGuidancePromptBlock } from "./prompt-block";

describe("buildPlaybookGuidancePromptBlock", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of Object.keys(tableResults)) delete tableResults[key];
  });

  it("returns null when the playbook has no active entries", async () => {
    tableResults["playbook_customize_entries"] = { data: [], error: null };

    const block = await buildPlaybookGuidancePromptBlock("ws-1", "invoice-reminder");

    expect(block).toBeNull();
  });

  it("renders active entries as a markdown bullet block", async () => {
    tableResults["playbook_customize_entries"] = {
      data: [
        { body: "Never remind clients with an active retainer" },
        { body: "Always CC my bookkeeper on firm reminders" },
      ],
      error: null,
    };

    const block = await buildPlaybookGuidancePromptBlock("ws-1", "invoice-reminder");

    expect(block).toBe(
      "## Workspace guidance for this play\n" +
        "- Never remind clients with an active retainer\n" +
        "- Always CC my bookkeeper on firm reminders"
    );
  });

  it("returns null instead of throwing when the query fails", async () => {
    tableResults["playbook_customize_entries"] = {
      data: null,
      error: { message: "boom" },
    };

    const block = await buildPlaybookGuidancePromptBlock("ws-1", "invoice-reminder");

    expect(block).toBeNull();
  });
});
