import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const getWorkspaceEntitlement = vi.fn();
const anyToolHasExternalEffect = vi.fn();

vi.mock("./entitlements", () => ({
  getWorkspaceEntitlement: (...args: unknown[]) =>
    getWorkspaceEntitlement(...args),
}));

vi.mock("@/app/_lib/composio/external-effect", () => ({
  anyToolHasExternalEffect: (...args: unknown[]) =>
    anyToolHasExternalEffect(...args),
}));

import { checkPlayAdmission } from "./play-admission";
import type { WorkspaceEntitlement } from "./types";

const WORKSPACE_ID = "ws-1";

function entitlement(
  overrides: Partial<WorkspaceEntitlement> = {},
): WorkspaceEntitlement {
  return {
    workspaceId: WORKSPACE_ID,
    tier: "starter",
    pricingVersion: "2026-08",
    status: "active",
    billingInterval: "month",
    playsIncluded: 25,
    playsUsed: 0,
    playsRemaining: 25,
    overageEnabled: false,
    periodStart: "2026-08-01T00:00:00.000Z",
    periodEnd: null,
    ...overrides,
  };
}

describe("checkPlayAdmission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getWorkspaceEntitlement.mockResolvedValue(entitlement());
    anyToolHasExternalEffect.mockResolvedValue(true);
  });

  it("allows a play with no acting steps without reading the entitlement", async () => {
    const decision = await checkPlayAdmission(WORKSPACE_ID, {
      toolSlugs: [],
      hasExternalCapabilityStep: false,
    });

    expect(decision.allowed).toBe(true);
    expect(getWorkspaceEntitlement).not.toHaveBeenCalled();
    expect(anyToolHasExternalEffect).not.toHaveBeenCalled();
  });

  it("allows a play whose act tools are all internal without reading the entitlement", async () => {
    // Mailbox housekeeping (label moves) never leaves Salt, so the play can
    // never bill and the bundle is irrelevant to it.
    anyToolHasExternalEffect.mockResolvedValue(false);

    const decision = await checkPlayAdmission(WORKSPACE_ID, {
      toolSlugs: ["GMAIL_ADD_LABEL_TO_EMAIL"],
      hasExternalCapabilityStep: false,
    });

    expect(decision.allowed).toBe(true);
    expect(getWorkspaceEntitlement).not.toHaveBeenCalled();
  });

  it("allows a billable play while the bundle has plays remaining", async () => {
    const decision = await checkPlayAdmission(WORKSPACE_ID, {
      toolSlugs: ["GMAIL_SEND_EMAIL"],
      hasExternalCapabilityStep: false,
    });

    expect(decision.allowed).toBe(true);
  });

  it("blocks a billable play when the bundle is exhausted and overage is off", async () => {
    getWorkspaceEntitlement.mockResolvedValue(
      entitlement({ playsUsed: 25, playsRemaining: 0 }),
    );

    const decision = await checkPlayAdmission(WORKSPACE_ID, {
      toolSlugs: ["GMAIL_SEND_EMAIL"],
      hasExternalCapabilityStep: false,
    });

    expect(decision.allowed).toBe(false);
    if (!decision.allowed) {
      expect(decision.entitlement.playsIncluded).toBe(25);
      expect(decision.userMessage).toMatch(/Billing/);
    }
  });

  it("allows an exhausted bundle when overage is enabled", async () => {
    getWorkspaceEntitlement.mockResolvedValue(
      entitlement({ playsUsed: 30, playsRemaining: 0, overageEnabled: true }),
    );

    const decision = await checkPlayAdmission(WORKSPACE_ID, {
      toolSlugs: ["GMAIL_SEND_EMAIL"],
      hasExternalCapabilityStep: false,
    });

    expect(decision.allowed).toBe(true);
  });

  it("gates an external capability act step even with no concrete slugs", async () => {
    // Capability act steps (send_message, create_invoice, ...) resolve their
    // concrete tool at runtime, so admission cannot classify a slug. They are
    // acting intents by definition, so they are gated on potential.
    getWorkspaceEntitlement.mockResolvedValue(
      entitlement({ playsUsed: 25, playsRemaining: 0 }),
    );

    const decision = await checkPlayAdmission(WORKSPACE_ID, {
      toolSlugs: [],
      hasExternalCapabilityStep: true,
    });

    expect(decision.allowed).toBe(false);
    expect(anyToolHasExternalEffect).not.toHaveBeenCalled();
  });

  it("fails open when the entitlement read throws", async () => {
    // Constraint 7: a billing-telemetry outage must not become a product
    // outage. An ungated play beats a customer action broken by the ledger.
    getWorkspaceEntitlement.mockRejectedValue(new Error("database down"));

    const decision = await checkPlayAdmission(WORKSPACE_ID, {
      toolSlugs: ["GMAIL_SEND_EMAIL"],
      hasExternalCapabilityStep: false,
    });

    expect(decision.allowed).toBe(true);
  });

  it("fails open when external-effect resolution throws", async () => {
    anyToolHasExternalEffect.mockRejectedValue(new Error("classifier down"));

    const decision = await checkPlayAdmission(WORKSPACE_ID, {
      toolSlugs: ["GMAIL_SEND_EMAIL"],
      hasExternalCapabilityStep: false,
    });

    expect(decision.allowed).toBe(true);
  });
});
