import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  findPlaybooksUsingTool,
  findPlaybooksUsingTools,
} from "./tool-usage";

/**
 * The reverse index behind the drift-disable feedback loop. These run
 * against the real repo registry — if a playbook drops GMAIL_SEND_EMAIL
 * from its allowlist, the first test should be updated to match.
 */
describe("findPlaybooksUsingTools", () => {
  it("finds the playbooks gated on GMAIL_SEND_EMAIL", () => {
    const affected = findPlaybooksUsingTool("GMAIL_SEND_EMAIL");

    expect(affected.length).toBeGreaterThan(0);
    expect(affected.map((p) => p.slug)).toContain("invoice-reminder");
    for (const usage of affected) {
      expect(usage.name).toBeTruthy();
      expect(usage.section).toBeTruthy();
    }
  });

  it("returns no entry for a slug no playbook allowlists", () => {
    const map = findPlaybooksUsingTools(["NOT_A_REAL_TOOL_SLUG"]);

    expect(map.size).toBe(0);
  });

  it("indexes multiple slugs in one scan", () => {
    const map = findPlaybooksUsingTools([
      "GMAIL_SEND_EMAIL",
      "STRIPE_LIST_INVOICES",
    ]);

    expect(map.get("GMAIL_SEND_EMAIL")?.length).toBeGreaterThan(0);
    expect(map.get("STRIPE_LIST_INVOICES")?.length).toBeGreaterThan(0);
  });

  it("empty input short-circuits without discovery", () => {
    expect(findPlaybooksUsingTools([]).size).toBe(0);
  });
});
