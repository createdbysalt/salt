import { describe, expect, it } from "vitest";
import {
  resolveMemoryProposals,
  type KnownWorkspaceEntities,
} from "./entity-resolver";
import type { MemoryProposal } from "../../types/memory-proposals";

const BASE_ENTITIES: KnownWorkspaceEntities = {
  orgs: [{ id: "org-1", name: "Manna House", domain: "mannahouse.org" }],
  works: [{ id: "work-1", name: "Site Strategy" }],
  people: [
    { id: "person-1", name: "Liam Chen", email: "liam@clientstudio.com" },
  ],
  meetingCaptures: [
    {
      id: "meeting-1",
      title: "Monthly training session",
      start: "2026-06-12T18:00:00.000Z",
    },
  ],
};

describe("resolveMemoryProposals", () => {
  it("flips org create to link when name fuzzy-matches at ≥85%", () => {
    const proposals: MemoryProposal[] = [
      {
        surface: "orgs",
        action: "create",
        hint: { name: "mannahouse" },
        confidence: 75,
        reason: "Org in subject.",
        system_play: "system:create-org",
      },
    ];

    const resolved = resolveMemoryProposals(proposals, BASE_ENTITIES);
    expect(resolved[0]?.action).toBe("link");
    expect(resolved[0]?.hint.existing_match_id).toBe("org-1");
    expect(resolved[0]?.confidence).toBeGreaterThanOrEqual(85);
  });

  it("flips work create to link for site strategy", () => {
    const proposals: MemoryProposal[] = [
      {
        surface: "work",
        action: "create",
        hint: { name: "Site Strategy" },
        confidence: 80,
        reason: "Deliverable ready.",
        system_play: "system:create-work",
      },
    ];

    const resolved = resolveMemoryProposals(proposals, BASE_ENTITIES);
    expect(resolved[0]?.action).toBe("link");
    expect(resolved[0]?.hint.existing_match_id).toBe("work-1");
  });

  it("links person by sender email", () => {
    const proposals: MemoryProposal[] = [
      {
        surface: "people",
        action: "create",
        hint: { name: "Liam Chen" },
        confidence: 72,
        reason: "Sender.",
        system_play: "system:create-person",
      },
    ];

    const resolved = resolveMemoryProposals(proposals, BASE_ENTITIES, {
      fromEmail: "liam@clientstudio.com",
    });

    expect(resolved[0]?.action).toBe("link");
    expect(resolved[0]?.hint.existing_match_id).toBe("person-1");
  });

  it("links meeting when title and date align", () => {
    const proposals: MemoryProposal[] = [
      {
        surface: "meetings",
        action: "create",
        hint: {
          name: "Monthly training session",
          datetime: "2026-06-12T18:00:00.000Z",
        },
        confidence: 78,
        reason: "Training email.",
        system_play: "system:create-meeting",
      },
    ];

    const resolved = resolveMemoryProposals(proposals, BASE_ENTITIES);
    expect(resolved[0]?.action).toBe("link");
    expect(resolved[0]?.hint.existing_match_id).toBe("meeting-1");
  });
});
