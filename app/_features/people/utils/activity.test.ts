import { describe, expect, it } from "vitest";
import type { ProfileFieldProvenanceView } from "@/app/_features/plays/playbooks/records-engine/types";
import {
  buildNarrativeActivityTimelineEntry,
  buildPersonActivityAskSaltPrompt,
  buildPlaybookProvenanceAskSaltPrompt,
  groupPersonActivityByDay,
  mapActivityEventToTimelineEntry,
  mapProvenanceFeedItemToTimelineEntry,
  mapProvenanceToActivity,
  mapLifecycleEventToTimelineEntry,
  personActivityStatusMeta,
  profileProvenanceStatusMeta,
  withNarrativeActivityEntry,
  type ProfileActivityTimelineEntry,
} from "./activity";
import type { FreshRecordNarrative } from "@/app/_features/memory/utils/record-narrative-cache";
import type { ProfileProvenanceFeedItem } from "@/app/_features/plays/playbooks/records-engine/types";

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

    expect(activity.kind).toBe("keeper");
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

  it("builds Ask Salt prompts for pending suggestions without approval language", () => {
    const activity = mapProvenanceToActivity(
      provenance({
        source: "ai_fallback",
        status: "pending",
        because: "Inferred from contact signals when no rule matched",
        confidence: 40,
      }),
    );

    expect(buildPersonActivityAskSaltPrompt(activity, "Liam Gillies")).toContain(
      "Keeper suggested relationship",
    );
    expect(buildPersonActivityAskSaltPrompt(activity, "Liam Gillies")).toContain(
      "review or change",
    );
  });

  it("groups activity rows by day for the timeline", () => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const grouped = groupPersonActivityByDay([
      mapProvenanceToActivity(provenance({ setAt: today.toISOString() })),
      mapProvenanceToActivity(provenance({ setAt: yesterday.toISOString() })),
    ]);

    expect(grouped.map(([day]) => day)).toEqual(["Today", "Yesterday"]);
  });

  it("labels pending rows as waiting", () => {
    const activity = mapProvenanceToActivity(provenance({ status: "pending" }));
    expect(personActivityStatusMeta(activity)?.label).toBe("Waiting");
    expect(profileProvenanceStatusMeta({ status: "pending", source: "rule" }).label).toBe(
      "Waiting",
    );
  });

  it("maps playbook provenance feed rows for the shared timeline", () => {
    const item: ProfileProvenanceFeedItem = {
      id: "prov-1",
      entityId: "person-1",
      entityName: "Liam Gillies",
      entityHref: "/people/person-1",
      field: "relationship_type",
      value: "unknown",
      source: "ai_fallback",
      status: "pending",
      because: "Inferred from contact signals when no rule matched",
      setAt: "2026-06-22T12:00:00.000Z",
    };

    const entry = mapProvenanceFeedItemToTimelineEntry(item);

    expect(entry.label).toBe("Keeper suggested relationship");
    expect(entry.entityName).toBe("Liam Gillies");
    expect(entry.detail).toContain("relationship →");
    expect(buildPlaybookProvenanceAskSaltPrompt(entry, "People Profile")).toContain(
      "Liam Gillies",
    );
  });

  it("maps legacy activity events for billing and demo timelines", () => {
    const entry = mapActivityEventToTimelineEntry({
      id: "a1",
      at: "2026-06-22T12:00:00.000Z",
      kind: "salt",
      label: "Record found in Stripe",
      detail: "Salt synced this billing record from a connected finance app.",
    });

    expect(entry.kind).toBe("ai");
    expect(entry.label).toBe("Record found in Stripe");
  });
});

describe("narrative activity provenance", () => {
  const narrative: FreshRecordNarrative = {
    summary: "A.",
    worthAttention: { reason: "B.", suggestedPlay: "" },
    model: "openai/gpt-4o-mini",
    generatedAt: "2026-06-27T18:00:00.000Z",
  };

  it("builds a Salt-authored entry from the cached narrative", () => {
    const entry = buildNarrativeActivityTimelineEntry(narrative);
    expect(entry).toMatchObject({
      kind: "ai",
      at: "2026-06-27T18:00:00.000Z",
      label: "Salt refreshed the summary",
    });
  });

  it("returns null when there is no narrative or generated timestamp", () => {
    expect(buildNarrativeActivityTimelineEntry(null)).toBeNull();
    expect(
      buildNarrativeActivityTimelineEntry({ ...narrative, generatedAt: "" }),
    ).toBeNull();
  });

  it("merges the narrative entry and keeps the timeline newest-first", () => {
    const existing: ProfileActivityTimelineEntry[] = [
      { id: "old", at: "2026-06-20T00:00:00.000Z", kind: "user", label: "Old", detail: null },
      { id: "newer", at: "2026-06-28T00:00:00.000Z", kind: "user", label: "Newer", detail: null },
    ];
    const merged = withNarrativeActivityEntry(existing, narrative);
    expect(merged.map((e) => e.id)).toEqual(["newer", "ai-summary-2026-06-27T18:00:00.000Z", "old"]);
  });

  it("leaves the timeline untouched when no narrative is present", () => {
    const existing: ProfileActivityTimelineEntry[] = [
      { id: "a", at: "2026-06-20T00:00:00.000Z", kind: "user", label: "A", detail: null },
    ];
    expect(withNarrativeActivityEntry(existing, null)).toHaveLength(1);
  });
});

describe("mapLifecycleEventToTimelineEntry", () => {
  it("humanizes first health computation from none to insufficient", () => {
    const entry = mapLifecycleEventToTimelineEntry({
      id: "health-1",
      eventType: "health_change",
      fromValue: null,
      toValue: "insufficient",
      source: "system",
      because: "Health recomputed from latest signals",
      createdAt: "2026-06-29T12:00:00.000Z",
      label: "Health Changed",
      description: "none → insufficient",
    });

    expect(entry.detail).toBe(
      "No health yet → Not enough signal yet · Health recomputed from latest signals",
    );
  });

  it("humanizes score and band pairs in health transitions", () => {
    const entry = mapLifecycleEventToTimelineEntry({
      id: "health-2",
      eventType: "health_change",
      fromValue: "45 · watch",
      toValue: "72 · healthy",
      source: "system",
      because: "Recent activity improved the score",
      createdAt: "2026-06-30T12:00:00.000Z",
      label: "Health Changed",
      description: "45 · watch → 72 · healthy",
    });

    expect(entry.detail).toBe(
      "45 · Watch → 72 · Healthy · Recent activity improved the score",
    );
  });
});
