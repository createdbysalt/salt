import { describe, expect, it } from "vitest";
import { buildKeeperProfileFindingPayload } from "./keeper-profile-findings";
import type { ProfileFieldResult } from "./types";

function profileResult(overrides: Partial<ProfileFieldResult> = {}): ProfileFieldResult {
  return {
    field: "relationship_type",
    value: "client",
    confidence: 82,
    because: "Company email domain implies an active client relationship",
    source: "rule",
    ruleId: "domain-client",
    status: "pending",
    evidence: { email: "liam@photon.studio" },
    ...overrides,
  };
}

describe("buildKeeperProfileFindingPayload", () => {
  it("routes pending person profile results to Needs You", () => {
    const payload = buildKeeperProfileFindingPayload({
      workspaceId: "workspace-1",
      entityType: "person",
      entityId: "person-1",
      field: "relationship_type",
      result: profileResult(),
      blueprintSlug: "people-profile",
      blueprintVersion: 2,
      provenanceId: "provenance-1",
    });

    expect(payload).toMatchObject({
      workspace_id: "workspace-1",
      person_id: "person-1",
      org_id: null,
      finding_type: "needs_routing",
      state: "needs_you",
      confidence: 82,
      title: "Mark this contact as Client",
    });
    expect(payload?.evidence.metadata).toMatchObject({
      keeper_profile: true,
      profile_entity_type: "person",
      profile_field: "relationship_type",
      profile_status: "pending",
      profile_provenance_id: "provenance-1",
    });
  });

  it("routes applied organization profile results to Auto-handled", () => {
    const payload = buildKeeperProfileFindingPayload({
      workspaceId: "workspace-1",
      entityType: "organization",
      entityId: "org-1",
      field: "website",
      result: profileResult({
        field: "website",
        value: "https://photon.studio",
        confidence: 92,
        status: "applied",
      }),
      blueprintSlug: "organizations-profile",
      blueprintVersion: 1,
      provenanceId: "provenance-2",
    });

    expect(payload).toMatchObject({
      person_id: null,
      org_id: "org-1",
      state: "auto_handled",
      title: "Saved website for this contact",
      confidence: 92,
    });
  });

  it("does not create findings for unknown relationship suggestions", () => {
    const payload = buildKeeperProfileFindingPayload({
      workspaceId: "workspace-1",
      entityType: "person",
      entityId: "person-1",
      field: "relationship_type",
      result: profileResult({ value: "unknown", confidence: 40, source: "ai_fallback" }),
      blueprintSlug: "people-profile",
      blueprintVersion: 2,
      provenanceId: "provenance-4",
      targetLabel: "Matheus Martins",
    });

    expect(payload).toBeNull();
  });

  it("does not create findings for work until the queue model supports work targets", () => {
    const payload = buildKeeperProfileFindingPayload({
      workspaceId: "workspace-1",
      entityType: "work",
      entityId: "work-1",
      field: "status",
      result: profileResult({ field: "status", value: "active" }),
      blueprintSlug: "work-profile",
      blueprintVersion: 1,
      provenanceId: "provenance-3",
    });

    expect(payload).toBeNull();
  });
});
