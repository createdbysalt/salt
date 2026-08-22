import { beforeEach, describe, expect, it, vi } from "vitest";

const mockExecuteRecordActionDefinition = vi.fn();
let existingOrg: { id: string; name: string } | null = null;

const mockFrom = vi.fn(() => {
  const builder = {
    select: () => builder,
    eq: () => builder,
    is: () => builder,
    maybeSingle: async () => ({ data: existingOrg, error: null }),
  };
  return builder;
});

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

vi.mock("./executor", () => ({
  executeRecordAction: (...args: unknown[]) => mockExecuteRecordActionDefinition(...args),
}));

vi.mock(
  "@/app/_features/plays/playbooks/records-engine/load-profile-playbook",
  () => ({
    loadProfilePlaybook: async () => ({
      systemRules: {},
      settings: {},
      blueprintVersion: 1,
    }),
  }),
);

vi.mock(
  "@/app/_features/plays/playbooks/records-engine/apply-org-profile",
  () => ({
    ORG_PROFILE_SLUG: "org-profile",
    evaluateOrgProfileFields: () => ({
      results: [],
      blueprintSlug: "org-profile",
      blueprintVersion: 1,
    }),
  }),
);

vi.mock(
  "@/app/_features/plays/playbooks/records-engine/write-provenance",
  () => ({
    applyProfileFieldResults: async () => undefined,
  }),
);

import { domainToOrgName } from "./org-naming";
import { resolveOrg } from "./org-resolver";

beforeEach(() => {
  existingOrg = null;
  mockExecuteRecordActionDefinition
    .mockReset()
    .mockResolvedValue({ success: true, entity_id: "org-new-1" });
});

describe("resolveOrg — vendor gate", () => {
  it("never creates an org for a known SaaS vendor domain", async () => {
    const result = await resolveOrg("ws-1", "notifications@clickup.com");

    expect(result.resolved).toBe(false);
    expect(result.confidence_reason).toMatch(/vendor/i);
    expect(mockExecuteRecordActionDefinition).not.toHaveBeenCalled();
  });

  it("matches vendor subdomains — receipts mail hosts count too", async () => {
    const result = await resolveOrg("ws-1", "receipts@mail.convertkit.com");

    expect(result.resolved).toBe(false);
    expect(mockExecuteRecordActionDefinition).not.toHaveBeenCalled();
  });

  it("does not resolve even when a vendor org already exists (pre-fix pollution)", async () => {
    existingOrg = { id: "org-mercury", name: "Mercury" };

    const result = await resolveOrg("ws-1", "team@mercury.com");

    expect(result.resolved).toBe(false);
    expect(mockExecuteRecordActionDefinition).not.toHaveBeenCalled();
  });

  it.each([
    "statements@mercury.com",
    "hello@tally.so",
    "team@recraft.com",
    "updates@recraft.ai",
  ])("blocks %s", async (email) => {
    const result = await resolveOrg("ws-1", email);

    expect(result.resolved).toBe(false);
    expect(mockExecuteRecordActionDefinition).not.toHaveBeenCalled();
  });

  it("skips personal email domains", async () => {
    const result = await resolveOrg("ws-1", "jane@gmail.com");

    expect(result.resolved).toBe(false);
    expect(mockExecuteRecordActionDefinition).not.toHaveBeenCalled();
  });

  it("still creates orgs for real client domains", async () => {
    const result = await resolveOrg("ws-1", "jane@acme-studio.com");

    expect(result.resolved).toBe(true);
    expect(result.is_new).toBe(true);
    expect(mockExecuteRecordActionDefinition).toHaveBeenCalledWith(
      "ws-1",
      "system:create-org",
      { name: "Acme Studio", domain: "acme-studio.com" },
    );
  });

  it("never births an org from a mail-infrastructure subdomain", async () => {
    // Humans write from apex domains; subdomains are automated product mail
    // (notifications@am.atlassian.com, receipts@email.vendor.io). Even a
    // human-shaped local part doesn't override the structural signal.
    const result = await resolveOrg("ws-1", "jane@mail.acme-studio.com");

    expect(result.resolved).toBe(false);
    expect(result.confidence_reason).toMatch(/subdomain/i);
    expect(mockExecuteRecordActionDefinition).not.toHaveBeenCalled();
  });

  it.each([
    "feedback@service.alibaba.com",
    "investor-comms@notifications.apexfintechsolutions.com",
    "team@am.atlassian.com",
  ])("blocks automated subdomain sender %s", async (email) => {
    const result = await resolveOrg("ws-1", email);

    expect(result.resolved).toBe(false);
    expect(mockExecuteRecordActionDefinition).not.toHaveBeenCalled();
  });

  it("treats two-part TLD apexes as real domains, not subdomains", async () => {
    const result = await resolveOrg("ws-1", "maria@kainos-labs.com.br");

    expect(result.resolved).toBe(true);
    expect(mockExecuteRecordActionDefinition).toHaveBeenCalledWith(
      "ws-1",
      "system:create-org",
      { name: "Kainos Labs", domain: "kainos-labs.com.br" },
    );
  });

  it("refuses to birth an org from a generic service domain", async () => {
    const result = await resolveOrg("ws-1", "someone@mail.com");

    expect(result.resolved).toBe(false);
    expect(mockExecuteRecordActionDefinition).not.toHaveBeenCalled();
  });
});

describe("domainToOrgName", () => {
  it("uses the registrable label across subdomains", () => {
    expect(domainToOrgName("acme-corp.com")).toBe("Acme Corp");
    expect(domainToOrgName("mail.convertkit.com")).toBe("Convertkit");
    expect(domainToOrgName("e.tally.so")).toBe("Tally");
    expect(domainToOrgName("app.acme.co.uk")).toBe("Acme");
  });

  it("returns null for generic service tokens", () => {
    expect(domainToOrgName("mail.com")).toBeNull();
    expect(domainToOrgName("noreply.io")).toBeNull();
    expect(domainToOrgName("localhost")).toBeNull();
  });
});
