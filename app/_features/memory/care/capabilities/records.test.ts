import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const memoryGetFacts = vi.fn(async (_input: unknown) => ({
  facts: {},
  signals: {} as Record<string, boolean | number | string>,
}));
const memoryUpdateField = vi.fn(async (_input: unknown) => ({
  action: "accumulated" as const,
  threshold: 85,
  confidence: 90,
  message: "accumulated",
}));

vi.mock("@/app/_lib/memory-tools", () => ({
  memoryGetFacts: (input: unknown) => memoryGetFacts(input),
  memoryUpdateField: (input: unknown) => memoryUpdateField(input),
}));

const queriedTables: string[] = [];

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      queriedTables.push(table);
      const chain: Record<string, unknown> = {};
      for (const method of ["select", "eq", "is", "not", "order", "limit"]) {
        chain[method] = vi.fn(() => chain);
      }
      chain.then = (resolve: (value: unknown) => void) =>
        resolve({ data: [] });
      return chain;
    }),
  })),
}));

vi.mock("../decision-pipeline", () => ({
  getCareFieldBar: vi.fn(async () => ({
    tier: "standard",
    bar: 85,
    alwaysAuto: false,
  })),
}));

import { runRecordsCapability, runRecordsForWorkspace } from "./records";

describe("records capability — work and billing coverage (7.4)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queriedTables.length = 0;
    memoryGetFacts.mockResolvedValue({ facts: {}, signals: {} });
  });

  it("fires the registry's work status rule when the signal is present", async () => {
    memoryGetFacts.mockResolvedValue({
      facts: {},
      signals: { work_proposal_accepted: true },
    });

    const result = await runRecordsCapability({
      workspaceId: "ws-1",
      signal: "scheduled_scan",
      entityType: "work",
      entityId: "work-1",
    });

    expect(result.rulesEvaluated).toBeGreaterThan(0);
    expect(result.rulesMatched).toBeGreaterThan(0);
    const statusWrite = memoryUpdateField.mock.calls
      .map((call) => call[0] as { field: string; value: string })
      .find((input) => input.field === "status");
    // Stored canon: an accepted proposal is "signed" ("won" was never a
    // storable work status — canon is draft/signed/active/on_hold/…).
    expect(statusWrite?.value).toBe("signed");
  });

  it("fires the registry's billing paid rule when payment covers the total", async () => {
    memoryGetFacts.mockResolvedValue({
      facts: {},
      signals: { billing_amount_paid_covers_total: true },
    });

    const result = await runRecordsCapability({
      workspaceId: "ws-1",
      signal: "scheduled_scan",
      entityType: "billing",
      entityId: "bill-1",
    });

    expect(result.rulesMatched).toBeGreaterThan(0);
    const statusWrite = memoryUpdateField.mock.calls
      .map((call) => call[0] as { field: string; value: string })
      .find((input) => input.field === "status");
    expect(statusWrite?.value).toBe("paid");
  });

  it("scans people, organizations, work, billing, and meetings tables", async () => {
    await runRecordsForWorkspace({ workspaceId: "ws-1" });

    expect(queriedTables).toEqual(
      expect.arrayContaining([
        "people",
        "organizations",
        "work",
        "billing_records",
        "meetings",
      ])
    );
  });

  it("resolves {{extracted}} from a trigger-carried signal value", async () => {
    const result = await runRecordsCapability({
      workspaceId: "ws-1",
      signal: "person_timezone_detected",
      entityType: "person",
      entityId: "person-1",
      signalValues: { person_timezone_detected: "America/New_York" },
    });

    expect(result.rulesMatched).toBeGreaterThan(0);
    const tzWrite = memoryUpdateField.mock.calls
      .map((call) => call[0] as { field: string; value: string })
      .find((input) => input.field === "timezone");
    expect(tzWrite?.value).toBe("America/New_York");
  });

  it("trigger-carried values win over computed signals", async () => {
    memoryGetFacts.mockResolvedValue({
      facts: {},
      signals: { person_timezone_detected: "America/Los_Angeles" },
    });

    await runRecordsCapability({
      workspaceId: "ws-1",
      signal: "person_timezone_detected",
      entityType: "person",
      entityId: "person-1",
      signalValues: { person_timezone_detected: "America/New_York" },
    });

    const tzWrite = memoryUpdateField.mock.calls
      .map((call) => call[0] as { field: string; value: string })
      .find((input) => input.field === "timezone");
    expect(tzWrite?.value).toBe("America/New_York");
  });

  it("fills billing_email from the billing-email signal, never from a boolean", async () => {
    const result = await runRecordsCapability({
      workspaceId: "ws-1",
      signal: "person_billing_email_extracted",
      entityType: "person",
      entityId: "person-1",
      signalValues: { person_billing_email_extracted: "ap@acme.com" },
    });

    const emailWrite = memoryUpdateField.mock.calls
      .map((call) => call[0] as { field: string; value: string })
      .find((input) => input.field === "billing_email");
    expect(emailWrite?.value).toBe("ap@acme.com");
    expect(result.rulesMatched).toBeGreaterThan(0);
  });

  it("completes past meetings from the end-passed signal", async () => {
    memoryGetFacts.mockResolvedValue({
      facts: {},
      signals: { meeting_end_passed: true },
    });

    const result = await runRecordsCapability({
      workspaceId: "ws-1",
      signal: "scheduled_scan",
      entityType: "meeting",
      entityId: "meet-1",
    });

    expect(result.rulesMatched).toBeGreaterThan(0);
    const statusWrite = memoryUpdateField.mock.calls
      .map((call) => call[0] as { field: string; value: string })
      .find((input) => input.field === "status");
    expect(statusWrite?.value).toBe("completed");
  });

  it("never writes boolean signal values through {{extracted}} templates", async () => {
    // meeting_synced_from_calendar is a scan-computed boolean; the eight
    // {{extracted}} rules keyed on it (start_time, meeting_url, …) must skip
    // rather than propose the literal string "true".
    memoryGetFacts.mockResolvedValue({
      facts: {},
      signals: { meeting_synced_from_calendar: true },
    });

    const result = await runRecordsCapability({
      workspaceId: "ws-1",
      signal: "scheduled_scan",
      entityType: "meeting",
      entityId: "meet-2",
    });

    const writes = memoryUpdateField.mock.calls.map(
      (call) => call[0] as { field: string; value: string }
    );
    expect(writes.every((w) => w.value !== "true")).toBe(true);
    // The concrete-value status rule still fires.
    expect(writes.find((w) => w.field === "status")?.value).toBe("scheduled");
    expect(result.rulesMatched).toBe(1);
  });

  it("fires {{extracted}} rules on the signal's string value (existence-based)", async () => {
    // Extraction signals carry the extracted string as their value. The
    // evaluator's default condition for {{extracted}} rules must be
    // existence — the old eq:true default could never match a string.
    memoryGetFacts.mockResolvedValue({
      facts: {},
      signals: { person_name_extracted: "Jane Doe" },
    });

    const result = await runRecordsCapability({
      workspaceId: "ws-1",
      signal: "person_name_extracted",
      entityType: "person",
      entityId: "person-1",
    });

    expect(result.rulesMatched).toBeGreaterThan(0);
    const nameWrite = memoryUpdateField.mock.calls
      .map((call) => call[0] as { field: string; value: string })
      .find((input) => input.field === "name");
    expect(nameWrite?.value).toBe("Jane Doe");
  });

  it("does not fire {{extracted}} rules when the signal is absent", async () => {
    memoryGetFacts.mockResolvedValue({
      facts: {},
      signals: { person_email_extracted: "jane@acme.com" },
    });

    const result = await runRecordsCapability({
      workspaceId: "ws-1",
      signal: "person_email_extracted",
      entityType: "person",
      entityId: "person-1",
    });

    const writes = memoryUpdateField.mock.calls.map(
      (call) => call[0] as { field: string; value: string }
    );
    // Only the email rule's signal is present — name/phone/title/etc.
    // extraction rules must stay silent.
    expect(writes.find((w) => w.field === "email")?.value).toBe(
      "jane@acme.com"
    );
    expect(writes.some((w) => w.field === "name")).toBe(false);
    expect(writes.some((w) => w.field === "phone")).toBe(false);
    expect(result.rulesMatched).toBe(writes.length);
  });

  it("maps the timezone signal to an ISO country for the country field", async () => {
    // Regression: the country fill rule used to propose the raw IANA zone
    // ("America/Chicago") as the country value. The timezone_country
    // transform must map it to an ISO 3166-1 alpha-2 code.
    const result = await runRecordsCapability({
      workspaceId: "ws-1",
      signal: "person_timezone_detected",
      entityType: "person",
      entityId: "person-1",
      signalValues: { person_timezone_detected: "America/Chicago" },
    });

    const writes = memoryUpdateField.mock.calls.map(
      (call) => call[0] as { field: string; value: string }
    );
    expect(writes.find((w) => w.field === "country")?.value).toBe("US");
    // The timezone field itself still receives the raw zone.
    expect(writes.find((w) => w.field === "timezone")?.value).toBe(
      "America/Chicago"
    );
    expect(result.rulesMatched).toBeGreaterThan(0);
  });

  it("skips the country rule for timezones with no country mapping", async () => {
    const result = await runRecordsCapability({
      workspaceId: "ws-1",
      signal: "person_timezone_detected",
      entityType: "person",
      entityId: "person-1",
      signalValues: { person_timezone_detected: "Antarctica/McMurdo" },
    });

    const writes = memoryUpdateField.mock.calls.map(
      (call) => call[0] as { field: string; value: string }
    );
    // No guess, no garbage: the country rule skips rather than proposing
    // the raw zone string.
    expect(writes.some((w) => w.field === "country")).toBe(false);
    expect(writes.find((w) => w.field === "timezone")?.value).toBe(
      "Antarctica/McMurdo"
    );
    expect(result.rulesMatched).toBe(writes.length);
  });
});
