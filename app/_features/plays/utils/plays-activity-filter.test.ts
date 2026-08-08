import { describe, expect, it } from "vitest";
import {
  isActLayerPlayRun,
  isMemoryCareActivityMetadata,
} from "./plays-activity-filter";

describe("isActLayerPlayRun", () => {
  const actResolver = (slug: string) =>
    slug === "invoice-reminder" ? ("act" as const) : null;

  it("keeps runs attributed to a real act-layer playbook", () => {
    expect(
      isActLayerPlayRun(
        { source_context: { source: "playbook", playbook_slug: "invoice-reminder" } },
        actResolver,
      ),
    ).toBe(true);
  });

  it("keeps Ask Salt and manual actions with no playbook", () => {
    expect(
      isActLayerPlayRun(
        { source_context: { source: "ask_salt", user_approved_at: "2026-08-08" } },
        actResolver,
      ),
    ).toBe(true);
    expect(
      isActLayerPlayRun({ source_context: { source: "manual" } }, actResolver),
    ).toBe(true);
  });

  it("drops retired and legacy learn-layer slugs", () => {
    for (const slug of [
      "memory-records",
      "memory-hygiene",
      "keeper-connections",
      "keeper-people-records",
      "onboarding-enrichment",
    ]) {
      expect(
        isActLayerPlayRun(
          { source_context: { source: "playbook", playbook_slug: slug } },
          actResolver,
        ),
      ).toBe(false);
    }
  });

  it("drops learn-layer playbooks that still resolve", () => {
    const learnResolver = () => "learn" as const;
    expect(
      isActLayerPlayRun(
        { source_context: { source: "playbook", playbook_slug: "anything" } },
        learnResolver,
      ),
    ).toBe(false);
  });

  it("drops system runs and unattributed legacy rows", () => {
    expect(
      isActLayerPlayRun(
        { source_context: { source: "system" } },
        actResolver,
      ),
    ).toBe(false);
    expect(isActLayerPlayRun({ source_context: {} }, actResolver)).toBe(false);
    expect(isActLayerPlayRun({ source_context: null }, actResolver)).toBe(false);
  });
});


describe("isMemoryCareActivityMetadata", () => {
  it("excludes Memory Care source rows", () => {
    expect(isMemoryCareActivityMetadata({ source: "memory-care" })).toBe(true);
  });

  it("excludes retired keeper / memory-care player slugs", () => {
    expect(isMemoryCareActivityMetadata({ player_slug: "keeper" })).toBe(true);
    expect(isMemoryCareActivityMetadata({ player_slug: "memory-care" })).toBe(
      true,
    );
    expect(isMemoryCareActivityMetadata({ playerSlug: "memory-care" })).toBe(
      true,
    );
  });

  it("keeps act-layer play activity", () => {
    expect(
      isMemoryCareActivityMetadata({
        source: "playbook",
        player_slug: "billing",
      }),
    ).toBe(false);
    expect(isMemoryCareActivityMetadata(null)).toBe(false);
    expect(isMemoryCareActivityMetadata({})).toBe(false);
  });
});
