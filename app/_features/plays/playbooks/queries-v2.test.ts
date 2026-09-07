import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PlaybookDefinitionV2 } from "./schema/v2/types";

const mockGetPlaybookBySlug = vi.fn();
const mockDiscoverV2Playbooks = vi.fn();
const mockListWorkspacePlaybookDefinitions = vi.fn();
const mockGetWorkspaceMemberOrNull = vi.fn();

vi.mock("./schema/v2/discovery", () => ({
  discoverV2Playbooks: () => mockDiscoverV2Playbooks(),
  getPlaybookBySlug: (slug: string) => mockGetPlaybookBySlug(slug),
}));

vi.mock("./db-definitions", () => ({
  listWorkspacePlaybookDefinitions: (workspaceId: string) =>
    mockListWorkspacePlaybookDefinitions(workspaceId),
}));

vi.mock("@/app/_lib/tenancy/context", () => ({
  getTenantContext: vi.fn(async () => ({
    context: {
      actorType: "workspaceMember",
      userId: "user-1",
      workspace: { id: "ws-1", role: "owner" },
      studio: null,
    },
  })),
}));

vi.mock("@/app/_lib/tenancy/guards", () => ({
  getWorkspaceMemberOrNull: (context: unknown) =>
    mockGetWorkspaceMemberOrNull(context),
  requireWorkspaceMember: vi.fn((context: { workspace: { id: string } }) => ({
    id: context.workspace.id,
  })),
}));

vi.mock("../actions/playbook-settings", () => ({
  getPlaybookEnabledStatesMap: vi.fn(async () => ({})),
  getPlaybookAppSelectionsMap: vi.fn(async (slugs: string[]) =>
    Object.fromEntries(slugs.map((slug) => [slug, []]))
  ),
}));

vi.mock("../lib/playbook-connectors", () => ({
  getPlaybookConnectorIds: vi.fn(() => []),
}));

import { getPlaybookV2BySlug, getPlaybooksV2ForWorkspace } from "./queries-v2";

function repoDefinition(
  overrides: Partial<PlaybookDefinitionV2> = {}
): PlaybookDefinitionV2 {
  return {
    name: "Invoice Reminder",
    slug: "invoice-reminder",
    version: "1.0.0",
    description: "Repo default description",
    section: "billing",
    layer: "act",
    voice: "billing",
    trigger: { type: "signal", signal: "billing_due_date_passed" },
    output: { type: "email_draft", approval: "ask" },
    steps: [
      { step: "fetch", id: "overdue_invoices", from: "billing.read_invoices" },
    ],
    ...overrides,
  };
}

function repoParsed(overrides: Partial<PlaybookDefinitionV2> = {}) {
  return {
    definition: repoDefinition(overrides),
    sectionMeta: null,
    validationErrors: [],
    packagePath: "/repo/v2/billing/invoice-reminder",
    hasScript: false,
    hasPlaybookMd: true,
  };
}

beforeEach(() => {
  mockGetPlaybookBySlug.mockReset();
  mockDiscoverV2Playbooks.mockReset();
  mockListWorkspacePlaybookDefinitions.mockReset();
  mockGetWorkspaceMemberOrNull.mockReset();

  mockGetWorkspaceMemberOrNull.mockReturnValue({ id: "ws-1", role: "owner" });
  mockListWorkspacePlaybookDefinitions.mockResolvedValue({
    playbooks: [],
    errors: [],
  });
  mockGetPlaybookBySlug.mockReturnValue(repoParsed());
  mockDiscoverV2Playbooks.mockReturnValue({
    sections: new Map(),
    allPlaybooks: [repoParsed()],
    errors: [],
    skipped: [],
  });
});

describe("getPlaybookV2BySlug", () => {
  it("returns the workspace copy when the playbook has been forked", async () => {
    mockListWorkspacePlaybookDefinitions.mockResolvedValue({
      playbooks: [
        {
          definition: repoDefinition({
            description: "Workspace-customized description",
          }),
          sectionMeta: null,
          validationErrors: [],
        },
      ],
      errors: [],
    });

    const item = await getPlaybookV2BySlug("invoice-reminder");

    expect(item).not.toBeNull();
    expect(item?.description).toBe("Workspace-customized description");
    expect(item?.origin).toBe("workspace");
    expect(item?.package).toBeUndefined();
  });

  it("falls back to the repo definition when no workspace copy exists", async () => {
    const item = await getPlaybookV2BySlug("invoice-reminder");

    expect(item?.description).toBe("Repo default description");
    expect(item?.origin).toBe("custom");
    expect(item?.package).toEqual({
      hasScript: false,
      hasPlaybookMd: true,
      packagePath: "/repo/v2/billing/invoice-reminder",
    });
  });

  it("stays repo-only when there is no workspace context", async () => {
    mockGetWorkspaceMemberOrNull.mockReturnValue(null);

    const item = await getPlaybookV2BySlug("invoice-reminder");

    expect(item?.origin).toBe("custom");
    expect(mockListWorkspacePlaybookDefinitions).not.toHaveBeenCalled();
  });

  it("resolves a workspace-authored playbook that has no repo definition", async () => {
    mockGetPlaybookBySlug.mockReturnValue(null);
    mockListWorkspacePlaybookDefinitions.mockResolvedValue({
      playbooks: [
        {
          definition: repoDefinition({
            slug: "my-own-playbook",
            name: "My Own Playbook",
          }),
          sectionMeta: null,
          validationErrors: [],
        },
      ],
      errors: [],
    });

    const item = await getPlaybookV2BySlug("my-own-playbook");

    expect(item).not.toBeNull();
    expect(item?.origin).toBe("workspace");
  });

  it("returns null for an unknown slug", async () => {
    mockGetPlaybookBySlug.mockReturnValue(null);

    expect(await getPlaybookV2BySlug("ghost")).toBeNull();
  });
});

describe("getPlaybooksV2ForWorkspace", () => {
  it("shadows the repo entry with the workspace copy on slug conflict", async () => {
    mockListWorkspacePlaybookDefinitions.mockResolvedValue({
      playbooks: [
        {
          definition: repoDefinition({
            description: "Workspace-customized description",
          }),
          sectionMeta: null,
          validationErrors: [],
        },
      ],
      errors: [],
    });

    const result = await getPlaybooksV2ForWorkspace();

    const matches = result.playbooks.filter(
      (p) => p.slug === "invoice-reminder"
    );
    expect(matches).toHaveLength(1);
    expect(matches[0].description).toBe("Workspace-customized description");
    expect(matches[0].origin).toBe("workspace");
    expect(result.counts.byOrigin).toEqual({ salt: 0, custom: 1 });
  });
});
