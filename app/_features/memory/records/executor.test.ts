import { beforeEach, describe, expect, it, vi } from "vitest";
import { executeRecordAction } from "./executor";

type QueryResult = { data: unknown; error: unknown };

function createQueryBuilder(result: QueryResult) {
  const builder: Record<string, unknown> = {};
  const chainMethods = ["select", "eq", "is", "neq", "insert", "update", "delete", "limit", "upsert"];
  for (const method of chainMethods) {
    builder[method] = vi.fn(() => builder);
  }
  builder.maybeSingle = vi.fn(async () => result);
  builder.single = vi.fn(async () => result);
  return builder;
}

const mockFrom = vi.fn();

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

vi.mock("./workspace-guard", () => ({
  assertEntitiesInWorkspace: vi.fn(async () => undefined),
  assertEntityInWorkspace: vi.fn(async () => undefined),
  EntityNotInWorkspaceError: class extends Error {},
  linkTypeToGuardType: (t: string) => t,
}));

describe("executeRecordAction create-person", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("dedupes by email before insert", async () => {
    const peopleLookup = createQueryBuilder({
      data: { id: "existing-id", name: "Jane" },
      error: null,
    });
    const peopleInsert = createQueryBuilder({ data: null, error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === "people") {
        return peopleLookup;
      }
      if (table === "activity_entries") {
        return createQueryBuilder({ data: null, error: null });
      }
      return peopleInsert;
    });

    const result = await executeRecordAction(
      "ws-1",
      "system:create-person",
      { name: "Jane Doe", email: "jane@acme.com" },
    );

    expect(result.success).toBe(true);
    expect(result.entity_id).toBe("existing-id");
    expect(peopleInsert.insert).not.toHaveBeenCalled();
  });

  it("inserts with relationship_type not relationship_status", async () => {
    const peopleLookup = createQueryBuilder({ data: null, error: null });
    const peopleInsert = createQueryBuilder({
      data: { id: "new-person-id" },
      error: null,
    });
    let peopleCall = 0;

    mockFrom.mockImplementation((table: string) => {
      if (table === "people") {
        peopleCall += 1;
        return peopleCall === 1 ? peopleLookup : peopleInsert;
      }
      if (table === "activity_entries") {
        return createQueryBuilder({ data: null, error: null });
      }
      return peopleInsert;
    });

    const result = await executeRecordAction("ws-1", "system:create-person", {
      name: "Jane Doe",
      email: "jane@acme.com",
      relationship_type: "client",
    });

    expect(result.success).toBe(true);
    expect(peopleInsert.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        workspace_id: "ws-1",
        name: "Jane Doe",
        email: "jane@acme.com",
        relationship_type: "client",
        relationship_status: "client",
        created_via: "capture_intake",
      })
    );
  });

  function setupCreatePersonMocks() {
    const peopleLookup = createQueryBuilder({ data: null, error: null });
    const peopleInsert = createQueryBuilder({
      data: { id: "new-person-id" },
      error: null,
    });
    const activityInsert = createQueryBuilder({ data: null, error: null });
    const playRunInsert = createQueryBuilder({ data: null, error: null });
    const saltLearningsInsert = createQueryBuilder({
      data: { id: "learning-1" },
      error: null,
    });
    let peopleCall = 0;

    mockFrom.mockImplementation((table: string) => {
      if (table === "people") {
        peopleCall += 1;
        return peopleCall === 1 ? peopleLookup : peopleInsert;
      }
      if (table === "activity_entries") {
        return activityInsert;
      }
      if (table === "play_runs") {
        return playRunInsert;
      }
      if (table === "salt_learnings") {
        return saltLearningsInsert;
      }
      return createQueryBuilder({ data: null, error: null });
    });

    return { activityInsert, playRunInsert, saltLearningsInsert };
  }

  function expectEnrichedActivityInsert(
    activityInsert: ReturnType<typeof createQueryBuilder>
  ) {
    expect(activityInsert.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        workspace_id: "ws-1",
        action: "created",
        title: "Person created",
        detail: "Jane Doe",
        metadata: expect.objectContaining({
          source: "capture_intake",
          player_slug: "memory-care",
          auto_executed: true,
          entity_type: "person",
          entity_id: "new-person-id",
          section: "relationships",
          confidence: 95,
          because: "Salt created a Memory record with high confidence.",
          preview: "Salt created a People record for Jane Doe using jane@acme.com.",
        }),
      })
    );
  }

  it("logs enriched Activity and a salt_learnings row, never a play_runs row", async () => {
    const { activityInsert, playRunInsert, saltLearningsInsert } =
      setupCreatePersonMocks();

    const result = await executeRecordAction("ws-1", "system:create-person", {
      name: "Jane Doe",
      email: "jane@acme.com",
    });

    expect(result.success).toBe(true);
    expectEnrichedActivityInsert(activityInsert);
    // Memory Care never creates plays: no play_runs row for the auto-handled mutation
    expect(playRunInsert.insert).not.toHaveBeenCalled();
    // The salt_learnings write happens (the executor swallows errors, so assert it)
    expect(saltLearningsInsert.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        workspace_id: "ws-1",
        entity_type: "person",
        entity_id: "new-person-id",
        entity_label: "Jane Doe",
        field_path: "record",
        field_label: "Record",
        new_value: "Jane Doe",
        confidence: 95,
        evidence_summary:
          "Salt created a Memory record with high confidence.",
        playbook_slug: "memory-records",
      })
    );
  });
});

describe("executeRecordAction create-org", () => {
  type OrgRow = { id: string; name: string; domain: string | null };

  function buildOrgTable(cfg: {
    domainMatch?: OrgRow | null;
    orgList?: OrgRow[];
    newId?: string;
  }) {
    const ops: string[] = [];
    const builder: Record<string, unknown> = {};
    for (const method of ["select", "eq", "is", "neq", "in", "limit"]) {
      builder[method] = vi.fn(() => builder);
    }
    builder.insert = vi.fn(() => {
      ops.push("insert");
      return builder;
    });
    builder.update = vi.fn(() => {
      ops.push("update");
      return builder;
    });
    builder.maybeSingle = vi.fn(async () => ({
      data: cfg.domainMatch ?? null,
      error: null,
    }));
    builder.single = vi.fn(async () => ({
      data: ops.includes("insert")
        ? { id: cfg.newId ?? "new-org-id" }
        : (cfg.domainMatch ?? null),
      error: null,
    }));
    builder.then = (resolve: (_value: { data: unknown; error: null }) => void) =>
      resolve({ data: cfg.orgList ?? [], error: null });
    return builder;
  }

  function setupCreateOrgMocks(cfg: {
    domainMatch?: OrgRow | null;
    orgList?: OrgRow[];
    websiteUrl?: string | null;
    newId?: string;
  }) {
    const orgBuilder = buildOrgTable(cfg);
    const workspaceBuilder = createQueryBuilder({
      data: { website_url: cfg.websiteUrl ?? null },
      error: null,
    });
    mockFrom.mockImplementation((table: string) => {
      if (table === "organizations") return orgBuilder;
      if (table === "workspaces") return workspaceBuilder;
      return createQueryBuilder({ data: null, error: null });
    });
    return { orgBuilder };
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("refuses to create an org for a known SaaS vendor domain", async () => {
    const { orgBuilder } = setupCreateOrgMocks({});

    const result = await executeRecordAction("ws-1", "system:create-org", {
      name: "Clickup",
      domain: "clickup.com",
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/saas vendor/i);
    expect(orgBuilder.insert).not.toHaveBeenCalled();
  });

  it("refuses to create an org for the workspace's own business domain", async () => {
    const { orgBuilder } = setupCreateOrgMocks({
      websiteUrl: "https://www.createdbysalt.com/",
    });

    const result = await executeRecordAction("ws-1", "system:create-org", {
      name: "Createdbysalt",
      domain: "createdbysalt.com",
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/own business domain/i);
    expect(orgBuilder.insert).not.toHaveBeenCalled();
  });

  it("matches subdomains of the workspace's own domain", async () => {
    setupCreateOrgMocks({ websiteUrl: "createdbysalt.com" });

    const result = await executeRecordAction("ws-1", "system:create-org", {
      name: "Mail",
      domain: "mail.createdbysalt.com",
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/own business domain/i);
  });

  it("rescues a domain passed as the name into a real name + domain pair", async () => {
    const { orgBuilder } = setupCreateOrgMocks({ orgList: [] });

    const result = await executeRecordAction("ws-1", "system:create-org", {
      name: "harborfinancial.com",
    });

    expect(result.success).toBe(true);
    expect(result.entity_id).toBe("new-org-id");
    expect(orgBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Harborfinancial",
        domain: "harborfinancial.com",
      })
    );
  });

  it("refuses a name that is a generic service domain", async () => {
    const { orgBuilder } = setupCreateOrgMocks({});

    const result = await executeRecordAction("ws-1", "system:create-org", {
      name: "mail.com",
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/service domain/i);
    expect(orgBuilder.insert).not.toHaveBeenCalled();
  });

  it("dedupes on normalized name and backfills the domain on the twin", async () => {
    const twin: OrgRow = {
      id: "org-clergy",
      name: "Harborfinancial",
      domain: null,
    };
    const { orgBuilder } = setupCreateOrgMocks({ orgList: [twin] });

    const result = await executeRecordAction("ws-1", "system:create-org", {
      name: "Example Advisors",
      domain: "harborfinancial.com",
    });

    expect(result.success).toBe(true);
    expect(result.entity_id).toBe("org-clergy");
    expect(orgBuilder.insert).not.toHaveBeenCalled();
    expect(orgBuilder.update).toHaveBeenCalledWith({
      domain: "harborfinancial.com",
    });
  });

  it("dedupes on normalized name without a domain and does not update", async () => {
    const twin: OrgRow = {
      id: "org-clergy",
      name: "Example Advisors",
      domain: "harborfinancial.com",
    };
    const { orgBuilder } = setupCreateOrgMocks({ orgList: [twin] });

    const result = await executeRecordAction("ws-1", "system:create-org", {
      name: "harbor financial",
    });

    expect(result.success).toBe(true);
    expect(result.entity_id).toBe("org-clergy");
    expect(orgBuilder.insert).not.toHaveBeenCalled();
    expect(orgBuilder.update).not.toHaveBeenCalled();
  });

  it("still creates a genuinely new org", async () => {
    const { orgBuilder } = setupCreateOrgMocks({
      orgList: [],
      websiteUrl: "https://createdbysalt.com",
    });

    const result = await executeRecordAction("ws-1", "system:create-org", {
      name: "Acme Studio",
      domain: "acme-studio.com",
    });

    expect(result.success).toBe(true);
    expect(result.entity_id).toBe("new-org-id");
    expect(orgBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Acme Studio", domain: "acme-studio.com" })
    );
  });
});

describe("executeRecordAction create-work", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("inserts slug with null parents when no person or org given", async () => {
    const projectsSlugLookup = createQueryBuilder({ data: null, error: null });
    const projectsInsert = createQueryBuilder({
      data: { id: "work-1" },
      error: null,
    });

    let projectsCall = 0;

    mockFrom.mockImplementation((table: string) => {
      if (table === "work") {
        projectsCall += 1;
        return projectsCall === 1 ? projectsSlugLookup : projectsInsert;
      }
      if (table === "activity_entries") {
        return createQueryBuilder({ data: null, error: null });
      }
      return createQueryBuilder({ data: null, error: null });
    });

    const result = await executeRecordAction("ws-1", "system:create-work", {
      name: "Photon Website",
    });

    expect(result.success).toBe(true);
    expect(projectsInsert.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        workspace_id: "ws-1",
        person_id: null,
        organization_id: null,
        name: "Photon Website",
        slug: "photon-website",
        status: "active",
      })
    );
  });

  it("resolves person and primary org into work parents", async () => {
    const projectsSlugLookup = createQueryBuilder({ data: null, error: null });
    const projectsInsert = createQueryBuilder({
      data: { id: "work-1" },
      error: null,
    });
    const peopleLookup = createQueryBuilder({
      data: { id: "person-1" },
      error: null,
    });
    const orgLinkLookup = createQueryBuilder({
      data: { organization_id: "org-1" },
      error: null,
    });
    const orgLookup = createQueryBuilder({
      data: { id: "org-1" },
      error: null,
    });

    let projectsCall = 0;

    mockFrom.mockImplementation((table: string) => {
      if (table === "work") {
        projectsCall += 1;
        return projectsCall === 1 ? projectsSlugLookup : projectsInsert;
      }
      if (table === "people") {
        return peopleLookup;
      }
      if (table === "organization_people") {
        return orgLinkLookup;
      }
      if (table === "organizations") {
        return orgLookup;
      }
      if (table === "activity_entries") {
        return createQueryBuilder({ data: null, error: null });
      }
      if (table === "entity_links") {
        return createQueryBuilder({ data: null, error: null });
      }
      return createQueryBuilder({ data: null, error: null });
    });

    const result = await executeRecordAction("ws-1", "system:create-work", {
      name: "Photon Website",
      person_id: "11111111-1111-1111-1111-111111111111",
    });

    expect(result.success).toBe(true);
    expect(projectsInsert.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        workspace_id: "ws-1",
        person_id: "11111111-1111-1111-1111-111111111111",
        organization_id: "org-1",
        name: "Photon Website",
        slug: "photon-website",
        status: "active",
      })
    );
  });
});

describe("executeRecordAction create-note", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("scopes notes to entity_type and entity_id instead of only entity_links", async () => {
    const notesInsert = createQueryBuilder({
      data: { id: "note-1" },
      error: null,
    });
    mockFrom.mockImplementation((table: string) => {
      if (table === "notes") return notesInsert;
      return createQueryBuilder({ data: null, error: null });
    });

    const result = await executeRecordAction(
      "ws-1",
      "system:create-note",
      {
        content: "Currently reviewing a pitch for an AI chat solution.",
        target_type: "person",
        target_id: "11111111-1111-1111-1111-111111111111",
      },
      "user-1",
    );

    expect(result.success).toBe(true);
    expect(notesInsert.insert).toHaveBeenCalledWith({
      workspace_id: "ws-1",
      content: "Currently reviewing a pitch for an AI chat solution.",
      author_type: "salt",
      created_by: "user-1",
      entity_type: "person",
      entity_id: "11111111-1111-1111-1111-111111111111",
      source: "ask_salt",
      source_ref: "chat:user-1",
      status: "confirmed",
      note_kind: "general",
      confidence: 100,
    });
  });

  it("rejects notes scoped to spaces", async () => {
    const result = await executeRecordAction("ws-1", "system:create-note", {
      content: "Space note",
      target_type: "space",
      target_id: "22222222-2222-2222-2222-222222222222",
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/people, organizations, or work/i);
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

describe("executeRecordAction archive-person", () => {
  it("uses archived_at for people archive", async () => {
    const peopleUpdate = createQueryBuilder({ data: null, error: null });
    mockFrom.mockReturnValue(peopleUpdate);

    const result = await executeRecordAction("ws-1", "system:archive-person", {
      person_id: "11111111-1111-1111-1111-111111111111",
    });

    expect(result.success).toBe(true);
    expect(peopleUpdate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        archived_at: expect.any(String),
      }),
    );
    const payload = (peopleUpdate.update as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as Record<string, unknown>;
    expect(payload).not.toHaveProperty("deleted_at");
  });
});

describe("executeRecordAction create-billing (artifact-first)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function setupCreateBillingMocks() {
    const billingInsert = createQueryBuilder({
      data: { id: "bill-1" },
      error: null,
    });
    // No existing resource or edge; inserts return fresh rows.
    const resourcesBuilder = createQueryBuilder({ data: null, error: null });
    resourcesBuilder.single = vi.fn(async () => ({
      data: { id: "res-1" },
      error: null,
    }));
    const linksBuilder = createQueryBuilder({ data: null, error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === "billing_records") return billingInsert;
      if (table === "resources") return resourcesBuilder;
      if (table === "entity_links") return linksBuilder;
      return createQueryBuilder({ data: null, error: null });
    });

    return { billingInsert, resourcesBuilder, linksBuilder };
  }

  it("creates a link resource + attachment edge when app_url is present", async () => {
    const { billingInsert, resourcesBuilder, linksBuilder } =
      setupCreateBillingMocks();

    const result = await executeRecordAction("ws-1", "system:create-billing", {
      direction: "receivable",
      amount_cents: 175000,
      number: "SALT-0044",
      app_url: "https://invoice.stripe.com/i/acct_test/in_1PZq8c",
    });

    expect(result.success).toBe(true);
    // app_url stays on the record as a projection of the attached Resource.
    expect(billingInsert.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        app_url: "https://invoice.stripe.com/i/acct_test/in_1PZq8c",
      }),
    );
    expect(resourcesBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        workspace_id: "ws-1",
        file_type: "link",
        external_url: "https://invoice.stripe.com/i/acct_test/in_1PZq8c",
        created_by_system: true,
      }),
    );
    expect(linksBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        workspace_id: "ws-1",
        source_type: "resource",
        source_id: "res-1",
        target_type: "billing",
        target_id: "bill-1",
        relation_type: "attachment",
      }),
    );
  });

  it("creates no artifact when app_url is absent", async () => {
    const { resourcesBuilder, linksBuilder } = setupCreateBillingMocks();

    const result = await executeRecordAction("ws-1", "system:create-billing", {
      direction: "receivable",
      amount_cents: 5000,
    });

    expect(result.success).toBe(true);
    expect(resourcesBuilder.insert).not.toHaveBeenCalled();
    expect(linksBuilder.insert).not.toHaveBeenCalled();
  });
});
