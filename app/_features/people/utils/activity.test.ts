import { describe, expect, it } from "vitest";
import type { ProfileFieldProvenanceView } from "@/app/_features/plays/playbooks/profile/types";
import { mapProvenanceToActivity } from "./activity";

function provenance(
  overrides: Partial<ProfileFieldProvenanceView>,
): ProfileFieldProvenanceView {
  return {
    field: "relationship_type",
    value: "client",
    source: "rule",
    ruleId: "rel-payment-client",
    confidence: 92,
    because: "Payment received",
    status: "applied",
    evidence: {},
    setAt: "2026-06-21T10:00:00.000Z",
    ...overrides,
  };
}

describe("mapProvenanceToActivity", () => {
  it("attributes Keeper rule updates", () => {
    const activity = mapProvenanceToActivity(provenance({ source: "rule" }));

    expect(activity.kind).toBe("keeper");
    expect(activity.label).toBe("Keeper updated relationship");
    expect(activity.detail).toBe("Payment received · 92% sure");
  });

  it("attributes pending AI suggestions", () => {
    const activity = mapProvenanceToActivity(
      provenance({
        field: "title",
        source: "ai_fallback",
        status: "pending",
        because: "Signature said Creative Director",
      }),
    );

    expect(activity.kind).toBe("ai");
    expect(activity.label).toBe("Keeper suggested job title");
    expect(activity.detail).toBe("Signature said Creative Director · 92% sure");
  });

  it("attributes manual corrections to the user", () => {
    const activity = mapProvenanceToActivity(
      provenance({
        field: "org_link",
        source: "manual",
        because: "You corrected this field",
      }),
    );

    expect(activity.kind).toBe("user");
    expect(activity.label).toBe("You updated organization");
  });

  it("maps each provenance row independently so history is not deduped", () => {
    const rows = [
      provenance({ setAt: "2026-06-21T10:00:00.000Z", value: "client" }),
      provenance({ setAt: "2026-06-20T10:00:00.000Z", value: "prospect" }),
    ];

    const activity = rows.map(mapProvenanceToActivity);

    expect(activity).toHaveLength(2);
    expect(activity.map((item) => item.id)).toEqual([
      "profile-relationship_type-2026-06-21T10:00:00.000Z",
      "profile-relationship_type-2026-06-20T10:00:00.000Z",
    ]);
  });
});
