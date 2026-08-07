import { beforeEach, describe, expect, it, vi } from "vitest";
import { executeSystemPlay } from "./executor";

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

describe("executeSystemPlay create-person", () => {
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

    const result = await executeSystemPlay(
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

    const result = await executeSystemPlay("ws-1", "system:create-person", {
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
        created_via: "system_play",
      })
    );
  });

  it("logs created people to Activity and Auto-handled play runs", async () => {
    const peopleLookup = createQueryBuilder({ data: null, error: null });
    const peopleInsert = createQueryBuilder({
      data: { id: "new-person-id" },
      error: null,
    });
    const activityInsert = createQueryBuilder({ data: null, error: null });
    const playRunInsert = createQueryBuilder({ data: null, error: null });
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
      return createQueryBuilder({ data: null, error: null });
    });

    const result = await executeSystemPlay("ws-1", "system:create-person", {
      name: "Jane Doe",
      email: "jane@acme.com",
    });

    expect(result.success).toBe(true);
    expect(activityInsert.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        workspace_id: "ws-1",
        action: "created",
        title: "Person created",
        detail: "Jane Doe",
        metadata: expect.objectContaining({
          source: "system_play",
          player_slug: "memory-care",
          auto_executed: true,
          entity_type: "person",
          entity_id: "new-person-id",
        }),
      })
    );
    expect(playRunInsert.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        workspace_id: "ws-1",
        target_type: "person",
        target_id: "new-person-id",
        target_label: "Jane Doe",
        title: "Added Jane Doe to People",
        state: "approved",
        queue: "auto_handled",
        metadata: expect.objectContaining({
          memory_care_profile: true,
          section: "relationships",
          profile_entity_type: "person",
          profile_entity_id: "new-person-id",
          profile_field: "record",
          profile_value: "Jane Doe",
        }),
      })
    );
  });
});

describe("executeSystemPlay create-work", () => {
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

    const result = await executeSystemPlay("ws-1", "system:create-work", {
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

    const result = await executeSystemPlay("ws-1", "system:create-work", {
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

describe("executeSystemPlay create-note", () => {
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

    const result = await executeSystemPlay(
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
    const result = await executeSystemPlay("ws-1", "system:create-note", {
      content: "Space note",
      target_type: "space",
      target_id: "22222222-2222-2222-2222-222222222222",
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/people, organizations, or work/i);
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

describe("executeSystemPlay archive-person", () => {
  it("uses archived_at for people archive", async () => {
    const peopleUpdate = createQueryBuilder({ data: null, error: null });
    mockFrom.mockReturnValue(peopleUpdate);

    const result = await executeSystemPlay("ws-1", "system:archive-person", {
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
