import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRunCareForSignal = vi.fn();
const mockExecuteRecordActionDefinition = vi.fn();
const mockMemoryUpdateField = vi.fn();

type Filter = [string, string, unknown];
let emailMatches: Array<Record<string, unknown>> = [];
let nameOnlyTwins: Array<Record<string, unknown>> = [];
let lastIlike: { field: string; value: unknown } | null = null;

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
      lastIlike = { field: f, value: v };
      return builder;
    },
    limit: () => builder,
    maybeSingle: async () => ({ data: null }),
    then: (resolve: (value: { data: unknown; error: unknown }) => void) => {
      const isNameOnlyLookup = filters.some(
        ([op, f, v]) => op === "is" && f === "email" && v === null,
      );
      resolve({
        data:
          table === "people"
            ? isNameOnlyLookup
              ? nameOnlyTwins
              : emailMatches
            : null,
        error: null,
      });
    },
  };
  return builder;
});

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));
vi.mock("@/app/_lib/memory-tools", () => ({
  memoryUpdateField: (...args: unknown[]) => mockMemoryUpdateField(...args),
}));
vi.mock("@/app/_features/memory/care/scheduler", () => ({
  runCareForSignal: (...args: unknown[]) => mockRunCareForSignal(...args),
}));
vi.mock("@/app/_features/people/records-engine", () => ({
  classifyEntity: () => ({ kind: "person" }),
  resolveIdentity: () => [],
  evaluateAdmission: () => ({
    action: "create",
    confidence: 90,
    reasons: ["bidirectional thread"],
    suggestedName: undefined,
  }),
  completePersonFields: () => ({
    relationshipType: "unknown",
    results: [],
    blueprintSlug: "people-profile",
    blueprintVersion: 1,
  }),
}));
vi.mock(
  "@/app/_features/plays/playbooks/records-engine/load-profile-playbook",
  () => ({
    loadPeopleProfilePlaybook: async () => ({
      systemRules: [],
      settings: {},
      blueprintVersion: 1,
    }),
  }),
);
vi.mock(
  "@/app/_features/plays/playbooks/records-engine/write-provenance",
  () => ({ applyProfileFieldResults: vi.fn() }),
);
vi.mock("./executor", () => ({
  executeRecordAction: (...args: unknown[]) => mockExecuteRecordActionDefinition(...args),
}));
vi.mock("./corroboration", () => ({
  countCorroboratingCategories: async () => 0,
}));

import { resolvePerson } from "./person-resolver";

const WS = "ws-1";

describe("resolvePerson — name-only twin adoption", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    emailMatches = [];
    nameOnlyTwins = [];
    lastIlike = null;
    mockExecuteRecordActionDefinition.mockResolvedValue({
      success: true,
      entity_id: "person-new",
    });
    mockRunCareForSignal.mockResolvedValue(undefined);
  });

  it("fills the missing email on a unique name-only twin instead of creating a duplicate", async () => {
    nameOnlyTwins = [{ id: "person-twin", name: "Jane Doe" }];

    const result = await resolvePerson(WS, {
      email: "jane@acme.com",
      name: "Jane Doe",
      sourceType: "hubspot",
      sourceCaptureId: "cap-1",
    });

    expect(result).toMatchObject({
      resolved: true,
      person_id: "person-twin",
      is_new: false,
      needs_confirmation: false,
    });
    // The write goes through the registry fillRule, not a raw update.
    expect(mockRunCareForSignal).toHaveBeenCalledWith(
      expect.objectContaining({
        signalKey: "person_email_extracted",
        entityType: "person",
        entityId: "person-twin",
        evidence: expect.objectContaining({
          signalValues: { person_email_extracted: "jane@acme.com" },
          producer: "hubspot",
          captureId: "cap-1",
        }),
      }),
    );
    expect(mockExecuteRecordActionDefinition).not.toHaveBeenCalled();
  });

  it("matches the twin name case-insensitively", async () => {
    nameOnlyTwins = [{ id: "person-twin", name: "jane doe" }];

    const result = await resolvePerson(WS, {
      email: "jane@acme.com",
      name: "Jane Doe",
    });

    expect(result.person_id).toBe("person-twin");
    expect(lastIlike).toEqual({ field: "name", value: "Jane Doe" });
  });

  it("creates a new person when two name-only twins make the match ambiguous", async () => {
    nameOnlyTwins = [
      { id: "person-twin-1", name: "Jane Doe" },
      { id: "person-twin-2", name: "Jane Doe" },
    ];

    const result = await resolvePerson(WS, {
      email: "jane@acme.com",
      name: "Jane Doe",
    });

    expect(result).toMatchObject({
      resolved: true,
      person_id: "person-new",
      is_new: true,
    });
    expect(mockExecuteRecordActionDefinition).toHaveBeenCalledWith(
      WS,
      "system:create-person",
      expect.objectContaining({ email: "jane@acme.com" }),
    );
    expect(mockRunCareForSignal).not.toHaveBeenCalled();
  });

  it("creates a new person when no name is available to match on", async () => {
    nameOnlyTwins = [{ id: "person-twin", name: "Jane Doe" }];

    const result = await resolvePerson(WS, { email: "jane@acme.com" });

    expect(result.person_id).toBe("person-new");
    expect(mockExecuteRecordActionDefinition).toHaveBeenCalled();
    expect(mockRunCareForSignal).not.toHaveBeenCalled();
  });

  it("creates a new person when no name-only twin exists", async () => {
    const result = await resolvePerson(WS, {
      email: "jane@acme.com",
      name: "Jane Doe",
    });

    expect(result.person_id).toBe("person-new");
    expect(mockRunCareForSignal).not.toHaveBeenCalled();
  });
});
