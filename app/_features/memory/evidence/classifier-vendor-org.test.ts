import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

function emptyTable() {
  const builder: Record<string, unknown> = {};
  for (const method of ["select", "eq", "not", "in", "is", "limit"]) {
    builder[method] = vi.fn(() => builder);
  }
  builder.then = (resolve: (value: { data: unknown[]; error: null }) => void) =>
    resolve({ data: [], error: null });
  return builder;
}

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: () => emptyTable() }),
}));

import { classifyEmailCapture } from "./classifier";

describe("classifyEmailCapture — vendor receipts never birth orgs", () => {
  it("suppresses the org domain signal for receipt mail from an unlisted vendor", async () => {
    const signals = await classifyEmailCapture("ws-1", {
      from: "billing@acme-unknown-vendor.io",
      to: ["me@createdbysalt.com"],
      subject: "Your receipt from AcmeTools #1042",
      body: "Payment received. Thanks for your subscription.",
    });

    const orgSignals = signals.filter((s) => s.entityType === "organization");
    expect(orgSignals).toEqual([]);
  });

  it("suppresses the org domain signal for known vendor domains", async () => {
    const signals = await classifyEmailCapture("ws-1", {
      from: "receipts@clickup.com",
      to: ["me@createdbysalt.com"],
      subject: "Your ClickUp receipt",
      body: "Thanks for your payment.",
    });

    const orgSignals = signals.filter((s) => s.entityType === "organization");
    expect(orgSignals).toEqual([]);
  });

  it("still emits the org signal for genuine correspondence from an unknown domain", async () => {
    const signals = await classifyEmailCapture("ws-1", {
      from: "jane@acmestudio.com",
      to: ["me@createdbysalt.com"],
      subject: "Brand refresh project",
      body: "Hi! We'd love to talk about a rebrand for our studio.",
    });

    const orgSignals = signals.filter((s) => s.entityType === "organization");
    const orgDomains = orgSignals.map((s) => s.extractedData.domain);
    expect(orgDomains).toContain("acmestudio.com");
    const senderSignal = orgSignals.find(
      (s) => s.extractedData.domain === "acmestudio.com"
    );
    expect(senderSignal?.signal).toBe("email_domain_unknown");
  });
});
