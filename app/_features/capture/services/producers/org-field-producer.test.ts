import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRunCareForSignal = vi.fn();
const mockMemoryUpdateField = vi.fn();
const mockResolvePerson = vi.fn();
const mockLinkPersonToOrg = vi.fn();
const mockExecuteSystemPlay = vi.fn();

type Filter = [string, string, unknown];
type Query = { table: string; filters: Filter[] };
type Resolver = (query: Query) => { data: unknown };

let resolver: Resolver;
const mockFrom = vi.fn((table: string) => {
  const filters: Filter[] = [];
  const builder = {
    select: () => builder,
    eq: (f: string, v: unknown) => {
      filters.push(["eq", f, v]);
      return builder;
    },
    is: (f: string, v: unknown) => {
      filters.push(["is", f, v]);
      return builder;
    },
    ilike: (f: string, v: unknown) => {
      filters.push(["ilike", f, v]);
      return builder;
    },
    order: () => builder,
    limit: () => builder,
    maybeSingle: async () => resolver({ table, filters }),
    then: (resolve: (value: { data: unknown }) => void) =>
      resolve(resolver({ table, filters })),
  };
  return builder;
});

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));
vi.mock("@/app/_features/memory/care/scheduler", () => ({
  runCareForSignal: (...args: unknown[]) => mockRunCareForSignal(...args),
}));
vi.mock("@/app/_lib/memory-tools", () => ({
  memoryUpdateField: (...args: unknown[]) => mockMemoryUpdateField(...args),
}));
vi.mock("@/app/_features/capture/services/system-plays/person-resolver", () => ({
  resolvePerson: (...args: unknown[]) => mockResolvePerson(...args),
}));
vi.mock("@/app/_features/capture/services/system-plays/org-resolver", () => ({
  linkPersonToOrg: (...args: unknown[]) => mockLinkPersonToOrg(...args),
}));
vi.mock("@/app/_features/capture/services/system-plays/executor", () => ({
  executeSystemPlay: (...args: unknown[]) => mockExecuteSystemPlay(...args),
}));

import { produceOrgFieldSignals } from "./org-field-producer";

const WS = "ws-1";
const ORG = { id: "org-1", name: "Northwind Traders" };

function existingOrgResolver(): Resolver {
  return ({ table, filters }) => {
    if (table === "organizations") return { data: ORG };
    if (table === "billing_records") return { data: [] };
    if (table === "work") return { data: [] };
    void filters;
    return { data: null };
  };
}

describe("produceOrgFieldSignals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolver = existingOrgResolver();
    mockRunCareForSignal.mockResolvedValue([]);
    mockMemoryUpdateField.mockResolvedValue({ action: "applied" });
    mockResolvePerson.mockResolvedValue({ resolved: false });
    mockLinkPersonToOrg.mockResolvedValue({ success: true });
    mockExecuteSystemPlay.mockResolvedValue({ success: true, entity_id: "org-new" });
  });

  it("dispatches org fill signals against the resolved org", async () => {
    const result = await produceOrgFieldSignals({
      workspaceId: WS,
      orgKey: "domain:northwind.com",
      fields: {
        signalValues: {
          org_name_extracted: "Northwind Traders",
          org_industry_inferred: "retail",
          org_subindustry_inferred: "grocery",
          org_website_found: "https://northwind.com",
        },
        name: "Northwind Traders",
      },
      source: "crm",
    });

    expect(result.orgId).toBe("org-1");
    expect(result.orgCreated).toBe(false);
    expect(mockRunCareForSignal).toHaveBeenCalledTimes(4);
    expect(mockRunCareForSignal).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: WS,
        entityType: "organization",
        entityId: "org-1",
        signalKey: "org_industry_inferred",
        evidence: expect.objectContaining({
          source: "crm",
          signalValues: expect.objectContaining({ org_industry_inferred: "retail" }),
        }),
      }),
    );
  });

  it("creates the org via system:create-org when a domain key misses", async () => {
    resolver = ({ table }) => {
      if (table === "organizations") return { data: null };
      if (table === "billing_records") return { data: [] };
      return { data: [] };
    };

    const result = await produceOrgFieldSignals({
      workspaceId: WS,
      orgKey: "domain:northwind.com",
      fields: {
        signalValues: { org_name_extracted: "Northwind Traders" },
        name: "Northwind Traders",
      },
      source: "crm",
    });

    expect(mockExecuteSystemPlay).toHaveBeenCalledWith(WS, "system:create-org", {
      name: "Northwind Traders",
      domain: "northwind.com",
    });
    expect(result.orgId).toBe("org-new");
    expect(result.orgCreated).toBe(true);
    expect(mockRunCareForSignal).toHaveBeenCalledWith(
      expect.objectContaining({ entityId: "org-new" }),
    );
  });

  it("never creates an org from a name-only key", async () => {
    resolver = () => ({ data: null });

    const result = await produceOrgFieldSignals({
      workspaceId: WS,
      orgKey: "name:northwind traders",
      fields: {
        signalValues: { org_name_extracted: "Northwind Traders" },
        name: "Northwind Traders",
      },
      source: "crm",
    });

    expect(result.orgId).toBeNull();
    expect(mockExecuteSystemPlay).not.toHaveBeenCalled();
    expect(mockRunCareForSignal).not.toHaveBeenCalled();
  });

  it("ignores personal-domain keys", async () => {
    const result = await produceOrgFieldSignals({
      workspaceId: WS,
      orgKey: "domain:gmail.com",
      fields: { signalValues: { org_name_extracted: "Gmail" } },
      source: "crm",
    });

    expect(result.orgId).toBeNull();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("resolves the contact and links them to the org", async () => {
    mockResolvePerson.mockResolvedValue({
      resolved: true,
      person_id: "person-1",
      person_name: "Ada Lovelace",
    });

    const result = await produceOrgFieldSignals({
      workspaceId: WS,
      orgKey: "domain:northwind.com",
      fields: {
        signalValues: { org_name_extracted: "Northwind Traders" },
        name: "Northwind Traders",
        contactEmail: "ada@northwind.com",
      },
      source: "crm",
    });

    expect(mockResolvePerson).toHaveBeenCalledWith(WS, {
      email: "ada@northwind.com",
      name: "Northwind Traders",
    });
    expect(mockLinkPersonToOrg).toHaveBeenCalledWith(WS, "person-1", "org-1");
    expect(result.contactLinked).toBe(true);
  });

  it("writes billing counterparty fields with fill-rule provenance", async () => {
    mockResolvePerson.mockResolvedValue({
      resolved: true,
      person_id: "person-1",
      person_name: "Ada Lovelace",
    });
    resolver = ({ table, filters }) => {
      if (table === "organizations") return { data: ORG };
      if (table === "work") return { data: [{ id: "work-1" }] };
      if (table === "billing_records") {
        const hasPendingName = filters.some(
          ([op, f]) => op === "ilike" && f === "metadata->>pending_person_name",
        );
        const missingOrg = filters.some(
          ([op, f, v]) => op === "is" && f === "organization_id" && v === null,
        );
        const missingWork = filters.some(
          ([op, f, v]) => op === "is" && f === "work_id" && v === null,
        );
        if (hasPendingName) return { data: [{ id: "br-pending" }] };
        if (missingWork) return { data: [{ id: "br-nowork" }] };
        if (missingOrg) return { data: [{ id: "br-noorg" }] };
        return { data: [] };
      }
      return { data: null };
    };

    const result = await produceOrgFieldSignals({
      workspaceId: WS,
      orgKey: "domain:northwind.com",
      fields: {
        signalValues: { org_name_extracted: "Northwind Traders" },
        name: "Northwind Traders",
        contactEmail: "ada@northwind.com",
      },
      source: "crm",
    });

    expect(result.billingWrites).toBe(3);
    const written = mockMemoryUpdateField.mock.calls.map((call) => ({
      entityType: call[0].entityType,
      entityId: call[0].entityId,
      field: call[0].field,
      value: call[0].value,
      ruleId: call[0].sourceDetails?.ruleId,
    }));
    expect(written).toContainEqual({
      entityType: "billing",
      entityId: "br-pending",
      field: "person_id",
      value: "person-1",
      ruleId: "billing-billingContact-billing_party_email_match",
    });
    expect(written).toContainEqual({
      entityType: "billing",
      entityId: "br-noorg",
      field: "organization_id",
      value: "org-1",
      ruleId: "billing-organization-billing_party_email_match",
    });
    expect(written).toContainEqual({
      entityType: "billing",
      entityId: "br-nowork",
      field: "work_id",
      value: "work-1",
      ruleId: "billing-linkedWork-billing_party_email_match",
    });
  });

  it("skips the work link when the contact fronts multiple active work records", async () => {
    mockResolvePerson.mockResolvedValue({
      resolved: true,
      person_id: "person-1",
      person_name: "Ada Lovelace",
    });
    resolver = ({ table }) => {
      if (table === "organizations") return { data: ORG };
      if (table === "work") return { data: [{ id: "w1" }, { id: "w2" }] };
      if (table === "billing_records") return { data: [] };
      return { data: null };
    };

    const result = await produceOrgFieldSignals({
      workspaceId: WS,
      orgKey: "domain:northwind.com",
      fields: {
        signalValues: { org_name_extracted: "Northwind Traders" },
        contactEmail: "ada@northwind.com",
      },
      source: "crm",
    });

    expect(result.billingWrites).toBe(0);
    expect(mockMemoryUpdateField).not.toHaveBeenCalled();
  });
});
